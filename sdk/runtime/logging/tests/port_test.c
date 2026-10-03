/* Model the buffered file ABI, execute the real adapter. No firmware. */
#include <stdio.h>
#include <string.h>
#include "octamod_log_port.h"
struct file_object { uint32_t word[6]; };
uint8_t octamod_log_io[512];
static uint32_t tcb=0x460ddde4u, mounted=1, usb, transport, other;
static uint8_t tracks[16], recorders[16], byte;
static char disk[2][OCTAMOD_LOG_FILE_SIZE], data[OCTAMOD_LOG_FILE_SIZE];
static int exists[2], lengths[2], failed_write, failed_close, corrupt_read;
static unsigned writes, opens, failures;
#define CHECK(x) do { if (!(x)) { fprintf(stderr,"FAIL %d: %s\n",__LINE__,#x); ++failures; } } while(0)
uint32_t *olog_host_u32(uint32_t a) {
 switch(a) { case 0x800068fc:return &tcb; case 0x460d1cb8:return &mounted; case 0x460e76a0:return &usb; case 0x800065b8:return &transport; default:return &other; }
}
uint8_t *olog_host_u8(uint32_t a) {
 if(a>=0x80006500u&&a<0x80006510u)return &tracks[a-0x80006500u];
 if(a>=0x80004f1eu&&a<=0x80004f1eu+15*84u)return &recorders[(a-0x80004f1eu)/84u];
 return &byte;
}
void octamod_log_event(enum octamod_log_level l,uint32_t t,uint16_t c,uint32_t a,uint32_t b){(void)l;(void)t;(void)c;(void)a;(void)b;}
void octamod_log_io_error(uint32_t op,int32_t r){(void)op;(void)r;}
int olog_host_size(uint32_t fd){return lengths[fd];}
int olog_stock_open(struct file_object *f,const char *p,const char *m,void *b,unsigned n){
 (void)b;CHECK(n==512);++opens;unsigned slot=strstr(p,"1.LOG")?1:0;
 memset(f,0,sizeof *f);f->word[0]=slot;f->word[5]=*m=='w';
 if(*m=='r'&&!exists[slot])return -12;
 if(*m=='w')exists[slot]=1;
 return 1;
}
int olog_stock_read(struct file_object *f,void *b,unsigned n){
 unsigned at=f->word[2],slot=f->word[0];
 if(at+n>(unsigned)lengths[slot])return -1;
 memcpy(b,disk[slot]+at,n);f->word[2]+=n;
 if(corrupt_read&&at>0)((char *)b)[0]^=1;
 return 1;
}
int olog_stock_write(struct file_object *f,const void *b,unsigned n){
 unsigned at=f->word[2],slot=f->word[0];++writes;
 if(failed_write)return -1;
 CHECK(at+n<=OCTAMOD_LOG_FILE_SIZE);
 memcpy(disk[slot]+at,b,n);f->word[2]+=n;f->word[4]=f->word[2];return 1;
}
int olog_stock_close(struct file_object *f){if(f->word[5])lengths[f->word[0]]=(int)f->word[4];return failed_close?-1:0;}
int main(void){
 CHECK(octamod_log_can_flush());CHECK(octamod_log_start_slot()==0);
 uint32_t *guards[]={&tcb,&mounted,&usb,&transport};
 for(unsigned i=0;i<4;++i){uint32_t old=*guards[i];*guards[i]=i<2?0:1;CHECK(!octamod_log_can_flush());*guards[i]=old;}
 for(unsigned i=0;i<16;++i){tracks[i]=1;CHECK(!octamod_log_can_flush());tracks[i]=0;recorders[i]=1;CHECK(!octamod_log_can_flush());recorders[i]=0;}
 memset(data,'\n',sizeof data);memcpy(data,"# OCTAMOD-LOG v2\n",17);
 CHECK(octamod_log_write_checkpoint(0,data,sizeof data,100));CHECK(writes==64&&lengths[0]==32768);CHECK(octamod_log_start_slot()==1);
 unsigned before=writes;
 CHECK(octamod_log_write_checkpoint(0,data,sizeof data,100));CHECK(writes-before==1); /* small prefix */
 data[1800]='X';CHECK(octamod_log_write_checkpoint(0,data,sizeof data,2000));CHECK(disk[0][1800]=='X');
 data[1800]='\n';before=writes;CHECK(octamod_log_write_checkpoint(0,data,sizeof data,100));CHECK(writes-before==4&&disk[0][1800]=='\n');
 CHECK(octamod_log_write_checkpoint(1,data,sizeof data,100));
 char peer[OCTAMOD_LOG_FILE_SIZE];memcpy(peer,disk[1],sizeof peer);
 failed_write=1;CHECK(!octamod_log_write_checkpoint(0,data,sizeof data,100));CHECK(lengths[0]==32768&&!memcmp(peer,disk[1],sizeof peer));
 failed_write=0;before=writes;CHECK(octamod_log_write_checkpoint(0,data,sizeof data,100));CHECK(writes-before==64); /* full retry */
 corrupt_read=1;CHECK(!octamod_log_write_checkpoint(0,data,sizeof data,100));corrupt_read=0;
 failed_close=1;CHECK(!octamod_log_write_checkpoint(0,data,sizeof data,100));failed_close=0;
 disk[0][0]='X';before=writes;CHECK(!octamod_log_write_checkpoint(0,data,sizeof data,100));CHECK(writes==before);
 memcpy(disk[0],data,17);lengths[0]=0;CHECK(!octamod_log_write_checkpoint(0,data,sizeof data,100));CHECK(writes==before);
 CHECK(!octamod_log_write_checkpoint(2,data,sizeof data,100));
 if (failures) return 1;
 puts("octamod-log port test: ok");
 return 0;
}
