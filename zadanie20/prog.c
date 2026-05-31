#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <fcntl.h>
#include <string.h>
#include <signal.h>
#include <stdbool.h>

#define BUTTON_YELLOW   "68"
#define BUTTON_BLUE     "69"

#define GPIO_PATH       "/sys/class/gpio"
#define EXPORT_PATH     GPIO_PATH "/export"
#define UNEXPORT_PATH   GPIO_PATH "/unexport"
#define DIRECTION_PATH  GPIO_PATH "/gpio%s/direction"
#define VALUE_PATH      GPIO_PATH "/gpio%s/value"

#define READ_INTERVAL   500000

static volatile sig_atomic_t keep_running = 1;

static void handle_sigint(int sig) {
    (void)sig;
    keep_running = 0;
}

static void write_sysfs(const char *path, const char *value) {
    int fd = open(path, O_WRONLY);
    if (fd < 0) {
        perror("Nie można otworzyć pliku do zapisu");
        exit(EXIT_FAILURE);
    }
    if (write(fd, value, strlen(value)) != (ssize_t)strlen(value)) {
        perror("Nie można zapisać do pliku");
        close(fd);
        exit(EXIT_FAILURE);
    }
    close(fd);
}

static void safe_usleep(unsigned usec) {
    const unsigned SLICE = 100000;
    while (usec > 0 && keep_running) {
        unsigned slice = (usec > SLICE) ? SLICE : usec;
        usleep(slice);
        usec -= slice;
    }
}

static char read_sysfs_value(const char *path) {
    char buf[2] = {0};
    int fd = open(path, O_RDONLY);
    if (fd < 0) {
        perror("Nie można otworzyć pliku do odczytu");
        exit(EXIT_FAILURE);
    }
    if (read(fd, buf, 1) != 1) {
        perror("Błąd odczytu z pliku");
        close(fd);
        exit(EXIT_FAILURE);
    }
    close(fd);
    return buf[0];
}

int main(void) {
    char path[128];

    signal(SIGINT, handle_sigint);

    write_sysfs(EXPORT_PATH, BUTTON_YELLOW);
    write_sysfs(EXPORT_PATH, BUTTON_BLUE);

    snprintf(path, sizeof(path), DIRECTION_PATH, BUTTON_YELLOW);
    write_sysfs(path, "in");
    snprintf(path, sizeof(path), DIRECTION_PATH, BUTTON_BLUE);
    write_sysfs(path, "in");

    printf("Monitorowanie przycisków (GPIO%s - żółty, GPIO%s - niebieski).\n",
           BUTTON_YELLOW, BUTTON_BLUE);
    printf("Wciśnij Ctrl+C, aby zakończyć.\n\n");

    while (keep_running) {
        char yellow_state, blue_state;

        snprintf(path, sizeof(path), VALUE_PATH, BUTTON_YELLOW);
        yellow_state = read_sysfs_value(path);

        snprintf(path, sizeof(path), VALUE_PATH, BUTTON_BLUE);
        blue_state = read_sysfs_value(path);

        printf("Żółty: %c  |  Niebieski: %c\n", yellow_state, blue_state);
        fflush(stdout);

        safe_usleep(READ_INTERVAL);
    }

    printf("\nZakończono monitorowanie. Czyszczenie GPIO...\n");

    write_sysfs(UNEXPORT_PATH, BUTTON_YELLOW);
    write_sysfs(UNEXPORT_PATH, BUTTON_BLUE);

    return 0;
}
