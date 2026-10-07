"""Synthetic contracts only; never load firmware or execute native code."""
from pathlib import Path
import sys,unittest
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'octabam/tools'))
import toolpath
from remix.schema import Module,Kind,Poke,Detour,CavePatch,Keep,DramRegion,Linked
from remix import ledger,keep,detour_guard,platform_build
BASE=0x40000400
def mod(name,**kwargs):return Module(name=name,key=name,kind=Kind.CF_PATCH,doc='Synthetic fixture',**kwargs)
class BuilderContracts(unittest.TestCase):
    def test_offset_tail_overlap_and_adjacency(self):
        a=mod('a',detours=(Detour(BASE+0x100,b'\0'*4,target=BASE,pad_to=10),))
        for offset in (2,6,8):
            b=mod('b',pokes=(Poke(BASE+0x100+offset,b'\0'*2,b'\0'*2),))
            self.assertTrue(ledger.check([a,b]))
        self.assertEqual(ledger.check([a,mod('b',pokes=(Poke(BASE+0x10a,b'\0'*2,b'\0'*2),))]),[])
    def test_kept_overlapping_bytes_and_source_reserve(self):
        a=mod('a',keeps=(Keep(BASE+0x100,b'abcd'),))
        self.assertEqual(ledger.check([a,mod('b',keeps=(Keep(BASE+0x102,b'cd'),))]),[])
        self.assertTrue(ledger.check([a,mod('b',keeps=(Keep(BASE+0x102,b'zz'),))]))
        self.assertTrue(ledger.check([a,mod('b',pokes=(Poke(BASE+0x102,b'cd',b'zz'),))]))
        with self.assertRaises(ValueError):mod('self',keeps=a.keeps,pokes=(Poke(BASE+0x102,b'cd',b'zz'),))
        image=bytearray(b'\0'*0x200);image[0x100:0x104]=b'abcd'
        self.assertEqual(keep.violations(image,BASE,[a]),[])
        image[0x103]=0;self.assertTrue(keep.violations(image,BASE,[a]))
        self.assertTrue(keep.violations(b'',BASE,[a]))
        c=mod('source',cf_patches=(CavePatch('reserve',BASE+0x100,b'\0'*4,reserve=32),))
        self.assertTrue(ledger.check([c,mod('tail',pokes=(Poke(BASE+0x11e,b'\0'*2,b'\0'*2),))]))
    def test_explicit_conflicts_and_region_declarations(self):
        self.assertTrue(ledger.check([mod('a',conflicts=(('b','shared state'),)),mod('b')]))
        with self.assertRaises(ValueError):mod('self',conflicts=(('self','invalid'),))
        with self.assertRaises(ValueError):mod('requires',requires=('a',),conflicts=(('a','invalid'),))
        with self.assertRaises(ValueError):mod('no-runtime',dram_regions=(DramRegion('ring',64),))
        for region in [('_end',64,16),('bad-name',64,16),('x',0,16),('x',16,3),('x',17*1024*1024,16)]:
            with self.assertRaises(ValueError):DramRegion(*region)
        unit=Linked('unit','synthetic.s',dram=True)
        self.assertTrue(ledger.check([mod('a',linked=(unit,),dram_regions=(DramRegion('ring',64),)),mod('b',linked=(unit,),dram_regions=(DramRegion('ring',64),))]))
    def test_legacy_detour_extends_only_verified_original_bytes(self):
        d=Detour(BASE,b'abcd',target=BASE)
        with patch('remix.stock_guard._verified_image',return_value=b'abcdef'):
            self.assertEqual(detour_guard.expected(d),b'abcdef')
        with patch('remix.stock_guard._verified_image',return_value=b'abcdez'):
            self.assertEqual(detour_guard.expected(d),b'abcdez')
        with patch('remix.stock_guard._verified_image',return_value=b'wrong!'):
            with self.assertRaises(ValueError):detour_guard.expected(d)
        with patch('remix.stock_guard._verified_image',side_effect=ValueError('original changed')):
            with self.assertRaises(ValueError):detour_guard.expected(d)
    def test_preboot_avoids_bss_and_regions(self):
        layout=dict(base=0x1000,runtime_end=0x2000,stage=0x2000,stage_end=0x2100,bss_end=0x4000,ceiling=0x10000,regions={'ring':[0xe000,0x1000]})
        def entry(dst):return dict(name='upload',dst=dst,rawlen=16,stage=0x5000,blob=b'packed')
        for dst in (0x3000,0xe010,0x48003000,0x10000):
            with self.assertRaises(ValueError):platform_build.preboot_layout(layout,[entry(dst)])
        self.assertEqual(len(platform_build.preboot_layout(layout,[entry(0x6000)])),2)
