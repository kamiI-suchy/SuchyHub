#include <stdio.h>
#include <fcntl.h>
#include <unistd.h>
#include <sys/ioctl.h>

#define IOCTL_MAGIC       'k'
#define IOCTL_GET_NAME     _IOC(_IOC_READ,  IOCTL_MAGIC, 1, 64)
#define IOCTL_GET_SURNAME  _IOC(_IOC_READ,  IOCTL_MAGIC, 2, 64)
#define IOCTL_GET_INDEX    _IOC(_IOC_READ,  IOCTL_MAGIC, 3, 64)

int main(void)
{
	int fd;
	char name[64];
	char surname[64];
	char index[64];

	fd = open("/dev/ioctl_dev", O_RDWR);
	if (fd < 0) {
		perror("open /dev/ioctl_dev");
		return 1;
	}

	if (ioctl(fd, IOCTL_GET_NAME, name) < 0) {
		perror("ioctl IOCTL_GET_NAME");
		close(fd);
		return 1;
	}
	printf("Imię: %s\n", name);

	if (ioctl(fd, IOCTL_GET_SURNAME, surname) < 0) {
		perror("ioctl IOCTL_GET_SURNAME");
		close(fd);
		return 1;
	}
	printf("Nazwisko: %s\n", surname);

	if (ioctl(fd, IOCTL_GET_INDEX, index) < 0) {
		perror("ioctl IOCTL_GET_INDEX");
		close(fd);
		return 1;
	}
	printf("Nr indeksu: %s\n", index);

	close(fd);
	return 0;
}
