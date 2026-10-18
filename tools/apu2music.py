"""Convert APU register logs (frame, reg, val) into compact per-channel 60Hz state tracks.
Loop detection works on note onsets (the engine uses a fractional tempo accumulator, so loops are not frame-exact);
each channel loops independently (the original driver loops channel sequences separately)."""
import json, sys, os, glob

def channel_states(log):
    nframes = max(f for f, _, _ in log) + 1
    regs = [0] * 0x18; enable = 0x0f; i = 0
    chans = {'p1': [], 'p2': [], 'tri': [], 'noise': []}
    for f in range(nframes):
        while i < len(log) and log[i][0] == f:
            _, r, v = log[i]; regs[r] = v
            if r == 0x15: enable = v
            i += 1
        def pulse(b):
            vol = regs[b] & 0x0f; duty = regs[b] >> 6
            t = regs[b + 2] | ((regs[b + 3] & 7) << 8)
            if not (enable >> (b // 4)) & 1 or t < 8: vol = 0
            return (t if vol else 0, vol, duty if vol else 0)
        chans['p1'].append(pulse(0)); chans['p2'].append(pulse(4))
        tt = regs[0xa] | ((regs[0xb] & 7) << 8)
        tri_on = (enable >> 2) & 1 and (regs[8] & 0x7f) > 0 and tt >= 2
        chans['tri'].append((tt if tri_on else 0,))
        nvol = regs[0xc] & 0x0f if (enable >> 3) & 1 else 0
        chans['noise'].append((regs[0xe] & 0x0f if nvol else 0, nvol, (regs[0xe] >> 7) if nvol else 0))
    return chans

def onsets(seq):
    """(frame, pitch) at every change of the pitch component (timer / noise period)."""
    out = []
    for f, s in enumerate(seq):
        if f == 0 or s[0] != seq[f - 1][0]:
            out.append((f, s[0]))
    return out

def find_loop(seq, min_period=8, win=48):
    """Return (loop_start_frame, loop_end_frame) using onset-sequence periodicity, or None."""
    if len(seq) < 1500: return None
    on = onsets(seq); pit = [p for _, p in on]; n = len(pit)
    if n < win * 2 + min_period: return None
    # search start s (intro length) then period k such that pit[j] == pit[j+k] for all j>=s with j+k<n
    for s in range(0, n - 2 * win):
        for k in range(min_period, (n - s) // 2):
            ok = True
            for j in range(s, n - k):
                if pit[j] != pit[j + k]: ok = False; break
            if ok and (n - k - s) >= win:
                return (on[s][0], on[s + k][0])
    return None

def rle(seq):
    out = []
    for s in seq:
        if out and out[-1][1:] == list(s): out[-1][0] += 1
        else: out.append([1, *s])
    return out

def silent(s): return all(v == 0 for v in s)

def convert(log):
    chans = channel_states(log); res = {}
    for name, seq in chans.items():
        lp = find_loop(seq)
        if lp:
            S, E = lp; cut = seq[:E]; loop = S
        else:
            cut = list(seq); loop = None
            while cut and silent(cut[-1]): cut.pop()
        res[name] = {"frames": len(cut), "loop": loop, "ev": rle(cut)}
    return {"channels": res}

if __name__ == "__main__":
    src = sys.argv[1]; dst = sys.argv[2]; os.makedirs(dst, exist_ok=True)
    for p in sorted(glob.glob(os.path.join(src, "raw_*.json"))):
        log = json.load(open(p))
        if not log: continue
        t = convert(log); sid = os.path.basename(p)[4:6]
        json.dump(t, open(os.path.join(dst, f"snd_{sid}.json"), "w"), separators=(',', ':'))
        print(sid, {k: (v["frames"], v["loop"], len(v["ev"])) for k, v in t["channels"].items()})
