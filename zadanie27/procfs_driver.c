#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>
#include <linux/proc_fs.h>
#include <linux/seq_file.h>

#define PROC_NAME "my_procfs"

static int counter;

static int procfs_show(struct seq_file *m, void *v)
{
	counter++;
	seq_printf(m, "Kamil Suchy\n");
	seq_printf(m, "Odczyt nr: %d\n", counter);
	return 0;
}

static int procfs_open(struct inode *inode, struct file *file)
{
	return single_open(file, procfs_show, NULL);
}

static const struct proc_ops procfs_fops = {
	.proc_open    = procfs_open,
	.proc_read    = seq_read,
	.proc_lseek   = seq_lseek,
	.proc_release = single_release,
};

static int __init procfs_init(void)
{
	proc_create(PROC_NAME, 0, NULL, &procfs_fops);
	printk(KERN_INFO "Modul procfs zaladowany (/proc/%s)\n", PROC_NAME);
	return 0;
}

static void __exit procfs_exit(void)
{
	remove_proc_entry(PROC_NAME, NULL);
	printk(KERN_INFO "Modul procfs wyladowany\n");
}

module_init(procfs_init);
module_exit(procfs_exit);

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Kamil Suchy");
MODULE_DESCRIPTION("Sterownik procfs zwracajacy imie, nazwisko i licznik");
