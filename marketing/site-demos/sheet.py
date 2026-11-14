import sys, glob
from PIL import Image
d=sys.argv[1]; pat=sys.argv[2] if len(sys.argv)>2 else 'r*.jpg'; cols=int(sys.argv[3]) if len(sys.argv)>3 else 7; step=int(sys.argv[4]) if len(sys.argv)>4 else 1
fs=sorted(glob.glob(d+'/'+pat))[::step]
ims=[Image.open(f) for f in fs]
w,h=ims[0].size; tw=int(2000/cols)-8; th=int(h*tw/w)
rows=(len(ims)+cols-1)//cols
sheet=Image.new('RGB',(cols*(tw+8),rows*(th+8)),'white')
for i,im in enumerate(ims): sheet.paste(im.resize((tw,th)),((i%cols)*(tw+8),(i//cols)*(th+8)))
sheet.save(d+'/sheet.jpg',quality=80); print(len(ims),sheet.size)
