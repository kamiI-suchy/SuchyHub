#include <stdio.h>
#include <stdlib.h>
#include <string.h>
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
	char buf[64];

	fd = open("/dev/ioctl_dev", O_RDWR);
	if (fd < 0) {
		perror("open /dev/ioctl_dev");
		return 1;
	}

	memset(buf, 0, sizeof(buf));
	if (ioctl(fd, IOCTL_GET_NAME, buf) < 0) {
		perror("ioctl IOCTL_GET_NAME");
		close(fd);
		return 1;
	}
	printf("Imie: %s\n", buf);

	memset(buf, 0, sizeof(buf));
	if (ioctl(fd, IOCTL_GET_SURNAME, buf) < 0) {
		perror("ioctl IOCTL_GET_SURNAME");
		close(fd);
		return 1;
	}
	printf("Nazwisko: %s\n", buf);

	memset(buf, 0, sizeof(buf));
	if (ioctl(fd, IOCTL_GET_INDEX, buf) < 0) {
		perror("ioctl IOCTL_GET_INDEX");
		close(fd);
		return 1;
	}
	printf("Nr indeksu: %s\n", buf);

	close(fd);
	return 0;
}
