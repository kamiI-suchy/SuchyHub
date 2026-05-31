obj-m := index_block.o 

KDIR  := /omap/openwrt/build_dir/target-arm_cortex-a8+vfpv3_musl_eabi/linux-omap/linux-5.10.201
PWD   := $(shell pwd)

default:
	$(MAKE) -C $(KDIR) M=$(PWD) modules
