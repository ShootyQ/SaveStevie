"""Catalogue drawn poses without repainting or warping the source artwork.

Run from the repository root. Pillow is only an authoring dependency; the site
and the preview remain dependency-free. Actual transparent gutters determine
the source rectangles, not an assumed perfect generated grid.
"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / 'assets/art/bootstomp'
pages, frames = {}, {}


def boundary(counts, expected, radius):
    lo, hi = max(1, int(expected-radius)), min(len(counts)-1, int(expected+radius))
    return min(range(lo, hi), key=lambda n: (counts[n], abs(n-expected)))


for name in ('arrival', 'stomp', 'fall', 'special', 'reaction', 'erasure'):
    im = Image.open(DEST / (name+'.png')).convert('RGBA')
    w, h = im.size
    alpha = im.getchannel('A')
    rows = [sum(v > 32 for v in alpha.crop((0, y, w, y+1)).tobytes()) for y in range(h)]
    ys = [0]+[boundary(rows, h*i/4, h*.065) for i in range(1, 4)]+[h]
    pages[name] = {'image': name+'.png', 'width': w, 'height': h, 'scale': round(320/(w/4), 6)}
    for row in range(4):
        y0, y1 = ys[row:row+2]
        columns = [sum(v > 32 for v in alpha.crop((x, y0, x+1, y1)).tobytes()) for x in range(w)]
        xs = [0]+[boundary(columns, w*i/4, w*.065) for i in range(1, 4)]+[w]
        for col in range(4):
            x0, x1 = xs[col:col+2]
            crop = im.crop((x0, y0, x1, y1))
            box = crop.getchannel('A').point(lambda a: 255 if a > 32 else 0).getbbox()
            if not box:
                raise ValueError(f'Empty frame {name}:{row*4+col}')
            # Whole-frame registration only. Never separately move limbs/faces.
            blue_x = []
            for y in range(crop.height):
                for x in range(crop.width):
                    r, g, b, a = crop.getpixel((x, y))
                    if a > 128 and b > 95 and b > r*1.45 and b > g*1.2:
                        blue_x.append(x)
            pivot_x = sum(blue_x)/len(blue_x) if blue_x else (box[0]+box[2])/2
            bx, by, ex, ey = box
            bw, bh = ex-bx, ey-by
            idx = row*4+col
            down = name == 'erasure' or (name == 'reaction' and idx < 8) or (name == 'fall' and 7 <= idx <= 13)
            pts = {'left_fist': [.10,.30,.12,.17], 'right_fist': [.90,.30,.12,.17], 'left_boot': [.20,.78,.19,.23], 'right_boot': [.80,.78,.19,.23], 'star': [.52,.57,.075,.085]} if down else {'left_fist': [.12,.48,.12,.17], 'right_fist': [.88,.44,.12,.17], 'left_boot': [.24,.86,.19,.18], 'right_boot': [.76,.86,.19,.18], 'star': [.52,.44,.075,.08]}
            if name == 'stomp':
                for target, values in ({1:{'right_boot':[.77,.77,.20,.20]},2:{'right_boot':[.78,.73,.20,.20]},3:{'right_boot':[.79,.58,.21,.24]},5:{'left_boot':[.23,.77,.20,.20]},7:{'left_boot':[.23,.59,.21,.24]},8:{'right_boot':[.78,.77,.20,.20]},12:{'left_boot':[.23,.66,.21,.23]}}.get(idx,{})).items():pts[target]=values
                if idx in (10,14):pts.update(left_fist=[.12,.17,.13,.17],right_fist=[.88,.17,.13,.17],star=[.52,.52,.075,.08])
            if name == 'fall' and idx in (4,5,6):
                pts.update({4:{'left_boot':[.22,.16,.20,.19],'right_boot':[.22,.16,0,0],'left_fist':[.38,.80,.13,.14],'right_fist':[.86,.82,.13,.14],'star':[.65,.65,.07,.08]},5:{'left_boot':[.18,.16,.19,.17],'right_boot':[.80,.16,.19,.17],'left_fist':[.14,.88,.13,.13],'right_fist':[.87,.88,.13,.13],'star':[.52,.75,0,0]},6:{'left_boot':[.17,.25,.18,.20],'right_boot':[.23,.78,.19,.20],'left_fist':[.4,.16,.13,.14],'right_fist':[.69,.83,.13,.14],'star':[.56,.64,.07,.09]}}[idx])
            if name == 'reaction' and idx >= 4:pts['star']=[.52,.5,0,0]
            if name == 'reaction' and idx in (11,12):
                pts.update(left_boot=[.20,.80,.19,.23],right_boot=[.80,.80,.19,.23],left_fist=[.38,.83,.12,.17],right_fist=[.62,.83,.12,.17])
            if name == 'reaction' and idx >= 13:
                pts.update(left_boot=[.12,.43,.18,.22],right_boot=[.87,.43,.18,.22],left_fist=[.22,.80,.13,.18],right_fist=[.78,.80,.13,.18])
            parts = {key:[round(bx+q[0]*bw,2),round(by+q[1]*bh,2),round(q[2]*bw,2),round(q[3]*bh,2)] for key,q in pts.items()}
            frames[f'{name}:{row*4+col}'] = {
                'page': name, 'rect': [x0, y0, x1-x0, y1-y0],
                'pivot': [round(pivot_x, 2), box[3]], 'inkBounds': list(box), 'parts': parts,
            }


# The expanded sheet is kept intact. Catalogue its actual transparent gutters,
# then register complete drawings at their blue-body centre and sole baseline.
im = Image.open(DEST / 'full-motion.png').convert('RGBA')
w, h = im.size
alpha = im.getchannel('A')
rows = [sum(v > 32 for v in alpha.crop((0,y,w,y+1)).tobytes()) for y in range(h)]
ys = [0]+[boundary(rows,h*i/6,h*.035) for i in range(1,6)]+[h]
pages['full-motion'] = {'image':'full-motion.png','width':w,'height':h,'scale':round(320/(w/6),6)}
for row in range(6):
    y0,y1=ys[row:row+2]
    columns=[sum(v>32 for v in alpha.crop((x,y0,x+1,y1)).tobytes()) for x in range(w)]
    xs=[0]+[boundary(columns,w*i/6,w*.025) for i in range(1,6)]+[w]
    for col in range(6):
        x0,x1=xs[col:col+2]
        crop=im.crop((x0,y0,x1,y1))
        box=crop.getchannel('A').point(lambda v:255 if v>32 else 0).getbbox()
        bx,by,ex,ey=box;bw,bh=ex-bx,ey-by
        blue=[x for y in range(crop.height) for x in range(crop.width)
              if (lambda r,g,b,a:a>128 and b>95 and b>r*1.45 and b>g*1.2)(*crop.getpixel((x,y)))]
        # Per-pose masks stay on the complete drawing; no detached body parts.
        pts={'left_fist':[.12,.49,.13,.18],'right_fist':[.88,.49,.13,.18],
             'left_boot':[.25,.84,.22,.17],'right_boot':[.76,.84,.22,.17],
             'star':[.53,.50,.08,.09]}
        idx=row*6+col
        if idx in (20,21):pts.update(left_fist=[.40,.55,.14,.17],right_fist=[.65,.55,.14,.17])
        if idx in (24,25):pts['right_boot']=[.76,.59,.25,.24]
        if idx==26:pts['left_boot']=[.32,.54,.25,.24]
        if idx in (27,28):pts.update(left_fist=[.16,.83,.14,.16],right_fist=[.86,.83,.14,.16])
        if idx==33:pts.update(left_boot=[.31,.23,.18,.17],right_boot=[.69,.23,.18,.17],left_fist=[.12,.83,.14,.16],right_fist=[.88,.83,.14,.16],star=[.53,.5,0,0])
        frames[f'full-motion:{idx}']={'page':'full-motion','rect':[x0,y0,x1-x0,y1-y0],
            'pivot':[round(sum(blue)/len(blue),2),ey], 'inkBounds':list(box),
            'parts':{n:[round(bx+q[0]*bw,2),round(by+q[1]*bh,2),round(q[2]*bw,2),round(q[3]*bh,2)] for n,q in pts.items()}}


clips = {}


def clip(name, page, ids, durations, loop=False, **extra):
    if isinstance(durations, (int, float)):
        durations = [durations]*len(ids)
    assert len(durations) == len(ids)
    clips[name] = {'frames': [f'{page}:{i}' for i in ids], 'durations': durations, 'loop': loop, **extra}


clip('intro_enter', 'arrival', [0, 1, 2, 3], [.3, .28, .32, .3], events={'0': 'intro_steps'})
clip('intro_challenge', 'arrival', [4, 5, 6, 7], [.35, .22, .42, .45], events={'1': 'toe_tap', '2': 'knuckle_crack', '3': 'intro_hmph'})
clip('idle', 'arrival', [8, 9, 10, 11], [.35, .3, .35, .3], True)
clip('walk', 'arrival', [12, 13, 14, 15], .18, True, events={'0': 'boot_step', '2': 'boot_step'})
# Screen-left/right, not the monster's anatomical left/right. Frame 6 switches
# the raised foot; it is intentionally excluded from the left charge.
clip('windup_left', 'stomp', [4, 5, 7], [.25, .55, 2.2], landingFoot='left', events={'0': 'stomp_windup'})
clip('windup_right', 'stomp', [0, 1, 2, 3], [.25, .35, .45, 1.95], landingFoot='right', events={'0': 'stomp_windup'})
clip('impact_left', 'stomp', [12, 13, 14, 15], [.08, .14, .18, .25], landingFoot='left', events={'1': 'stomp_and_ripple'})
clip('impact_right', 'stomp', [8, 9, 10, 11], [.08, .14, .18, .25], landingFoot='right', events={'1': 'stomp_and_ripple'})
clip('stumble_right', 'fall', [0, 1, 2, 3], [.1, .12, .14, .12], events={'1': 'foot_slip'})
clip('stumble_left', 'fall', [0, 1, 2, 3], [.1, .12, .14, .12], flipX=True, events={'1': 'foot_slip'})
clip('faceplant', 'fall', [4, 5, 6, 7], [.12, .2, .18, .22], events={'1': 'faceplant'})
clip('fallen', 'fall', [8, 9, 10, 11], [.28, .25, .3, .3], True)
clip('recover', 'fall', [12, 13, 14, 15], [.2, .22, .22, .3])
for original in ('faceplant', 'fallen', 'recover'):
    clips[original+'_left'] = {**clips[original], 'flipX': True}
# The last scrape cell clips an extended fist at the sheet edge. The authored
# three-pose scrape is followed back to its ready pose instead of using it.
clip('shoe_scrape', 'special', [0, 1, 2, 1, 0], [.18, .2, .28, .14, .18], events={'2': 'shoe_scrape'})
clip('tantrum', 'special', [4, 5, 6, 7], [.13, .13, .17, .22], events={'0': 'tantrum_steps'})
clip('lace_flick', 'special', [8, 9, 10, 11], [.2, .35, .32, .22], events={'3': 'lace_twang'})
clip('lace_rebound', 'special', [12, 13, 14, 15], [.16, .15, .24, .3], events={'1': 'lace_snap'})
clip('rub_flinch', 'reaction', [0, 1, 2, 3], [.1, .12, .14, .18], events={'1': 'rub_hit'})
clip('patch_gone', 'reaction', [4, 5, 6, 7], [.12, .16, .18, .22], events={'0': 'patch_pop'})
clip('defeat', 'reaction', list(range(8, 16)), [.3, .25, .24, .3, .35, .35, .5, .8], events={'0': 'defeat_grumble', '6': 'defeat_flop'})

# Whole-pose replacement for the layered animation. Keep specialised lace,
# exposed rub targets and defeat art, which have their own readable poses.
clip('intro_enter','full-motion',[0,1,3,4],.18,True)
clip('intro_challenge','full-motion',list(range(18,24)),[.20,.20,.25,.25,.24,.30])
clip('idle','full-motion',[5],1,True)
clip('walk','full-motion',list(range(6,18)),.06,True,events={'0':'boot_step','6':'boot_step'})
clip('windup_right','full-motion',[24,25],[.55,2.45],landingFoot='right')
clip('windup_left','full-motion',[24,25],[.55,2.45],flipX=True,landingFoot='left')
clip('impact_right','full-motion',[27,28,29],[.14,.22,.29],landingFoot='right')
clip('impact_left','full-motion',[27,28,29],[.14,.22,.29],flipX=True,landingFoot='left')
clip('stumble_right','full-motion',[30,31,32],[.14,.16,.18])
clip('stumble_left','full-motion',[30,31,32],[.14,.16,.18],flipX=True)
clip('faceplant','full-motion',[32,33],[.22,.50])
clip('faceplant_left','full-motion',[32,33],[.22,.50],flipX=True)
clip('recover','full-motion',[34,35],[.46,.48])
clip('recover_left','full-motion',[34,35],[.46,.48],flipX=True)

patches = {}
for key, label, ids in (
    ('left_fist', 'Left fist', [0, 1, 2, 3]),
    ('right_fist', 'Right fist', [0, 4, 5, 6]),
    ('left_boot', 'Left boot', [0, 7, 8, 9]),
    ('right_boot', 'Right boot', [0, 10, 11, 12]),
    ('star', 'Chest star', [0, 13, 14, 15]),
):
    clip('erase_'+key, 'erasure', ids, [.65, .45, .45, .8])
    patches[key] = {'label': label, 'passes': 3, 'referenceFrames': [f'erasure:{i}' for i in ids]}

data = {
    'version': 1, 'status': 'active-wave-10',
    'pages': pages, 'frames': frames, 'clips': clips, 'patches': patches,
    'excludedFrames': {'stomp:6': 'Raised foot changes side.', 'special:3': 'Extended fist touches outer sheet edge.'},
    'scenes': {
        'Intro': [['intro_enter', 1.2], ['intro_challenge', 1.44], ['idle', 1.3]],
        'Right stomp — countered': [['windup_right', 3], ['stumble_right', .48], ['faceplant', .72], ['fallen', 2.8], ['recover', .94], ['idle', .5]],
        'Left stomp — countered': [['windup_left', 3], ['stumble_left', .48], ['faceplant_left', .72], ['fallen_left', 2.8], ['recover_left', .94], ['idle', .5]],
        'Stomp — gets through': [['windup_right', 3], ['impact_right', .65], ['idle', 1]],
        'Scrape and shuffle': [['shoe_scrape', .98], ['tantrum', .65], ['walk', 1.44], ['idle', .8]],
        'Lace — thrown': [['lace_flick', 1.09], ['idle', 1]],
        'Lace — caught': [['lace_flick', .87], ['lace_rebound', .85], ['idle', 1]],
        'Defeat': [['defeat', 3.09]],
    },
    'integration': {
        'labels': 'left/right refer to screen space',
        'paperEffects': 'The active fight reuses paper-press dents and draws travelling folded-paper ridges and scrape telegraphs.',
        'erasure': 'Reference states are independent per part, not 32 combined damage-state atlases. The fight retains per-part wear and maps masks to each pose; changing clips never restores erased regions.',
        'registration': 'Whole drawn frames share a feet baseline; pivots and page scales are authoring registration, not limb puppetry.',
        'timings': 'Preview timings only; boss simulation must explicitly trigger impact and exposure events.',
    },
}
(DEST / 'animations.json').write_text(json.dumps(data, indent=2)+'\n')
print(f'Catalogued {len(frames)} drawn poses, {len(clips)} clips, {len(patches)} independent erase references.')

(ROOT / 'js/bootstomp-art.js').write_text('/* Generated by scripts/catalogue-bootstomp.py. */\nDoodleDefender.bootstompArt='+json.dumps(data,separators=(',',':'))+';\n')
