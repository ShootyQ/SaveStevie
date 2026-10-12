"""Generate deterministic original pressure-whistle and steam-pop PCM effects."""
import math, random, wave, struct
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
sr=22050
for name,duration in [('thermal-pressure',.5),('thermal-pop',.36)]:
 rng=random.Random(74);samples=[];phase=0;low=0;prev=0
 for i in range(int(sr*duration)):
  t=i/sr;p=t/duration;noise=rng.uniform(-1,1);low=.7*low+.3*noise
  if name=='thermal-pressure':
   frequency=650+1000*p*p;phase+=2*math.pi*frequency/sr
   whistle=math.sin(phase)*(max(0,p-.25)/.75)**1.2*.32
   creak=math.sin(2*math.pi*(170*t+80*t*t))*low*.55*(1-p)
   envelope=min(1,t/.015)*min(1,(duration-t)/.025);value=(whistle+creak)*envelope
  else:
   envelope=min(1,t/.006)*math.exp(-9*p);pop=math.sin(2*math.pi*(180*t-90*t*t))*math.exp(-35*t)*.32
   value=(low*.85+pop)*envelope
  samples.append(struct.pack('<h',int(max(-1,min(1,value))*32767)))
 with wave.open(str((ROOT / 'assets/audio/effects')/(name+'.wav')),'wb') as out:
  out.setnchannels(1);out.setsampwidth(2);out.setframerate(sr);out.writeframes(b''.join(samples))
