#include <stdio.h>
#include <unistd.h>
#include <stdlib.h>
#include <string.h>
#include <termios.h>
#include <ftdi.h>

static struct termios orig_termios;

static void disable_raw_mode(void)
{
    tcsetattr(STDIN_FILENO, TCSAFLUSH, &orig_termios);
}

static void enable_raw_mode(void)
{
    tcgetattr(STDIN_FILENO, &orig_termios);
    atexit(disable_raw_mode);
    struct termios raw = orig_termios;
    raw.c_lflag &= ~(ECHO | ICANON);
    tcsetattr(STDIN_FILENO, TCSAFLUSH, &raw);
}

static void print_leds(unsigned char state)
{
    const int led_bits[4] = {0, 1, 3, 2};

    printf("\rLEDy: ");
    for (int i = 0; i < 4; i++) {
        const char *status = ((state >> led_bits[i]) & 1) ? "OFF" : "ON ";
        printf("[LED%d:%s] ", i + 1, status);
    }
    fflush(stdout);
}

int main(void)
{
    struct ftdi_context *ftdi;
    int f;
    unsigned char state = 0x0F;

    if ((ftdi = ftdi_new()) == 0) {
        fprintf(stderr, "ftdi_new failed\n");
        return EXIT_FAILURE;
    }

    f = ftdi_usb_open(ftdi, 0x0403, 0x6001);
    if (f < 0 && f != -5) {
        fprintf(stderr, "unable to open ftdi device: %d (%s)\n",
                f, ftdi_get_error_string(ftdi));
        ftdi_free(ftdi);
        exit(-1);
    }
    printf("ftdi open succeeded: %d\n", f);

    f = ftdi_set_bitmode(ftdi, 0xF0 | state, BITMODE_CBUS);
    if (f < 0) {
        fprintf(stderr, "set_bitmode failed, error %d (%s)\n",
                f, ftdi_get_error_string(ftdi));
        ftdi_usb_close(ftdi);
        ftdi_free(ftdi);
        exit(-1);
    }

    printf("\nSterowanie LEDami (aktywne niskim stanem):\n");
    printf("  1 2 3 4  – włącz LED\n");
    printf("  q w e r  – wyłącz LED\n");
    printf("  ESC / x  – wyjście\n\n");
    print_leds(state);

    enable_raw_mode();

    while (1) {
        char c;
        if (read(STDIN_FILENO, &c, 1) != 1) break;

        unsigned char prev = state;

        switch (c) {
        case '1': state &= ~0x01; break;
        case '2': state &= ~0x02; break;
        case '3': state &= ~0x08; break;
        case '4': state &= ~0x04; break;

        case 'q': state |=  0x01; break;
        case 'w': state |=  0x02; break;
        case 'e': state |=  0x08; break;
        case 'r': state |=  0x04; break;

        case 27:
        case 'x': disable_raw_mode();
                  printf("\nKoniec.\n");
                  goto cleanup;
        default:  break;
        }

        if (state != prev) {
            unsigned char mask = 0xF0 | state;
            f = ftdi_set_bitmode(ftdi, mask, BITMODE_CBUS);
            if (f < 0) {
                fprintf(stderr, "\nset_bitmode failed, error %d (%s)\n",
                        f, ftdi_get_error_string(ftdi));
                disable_raw_mode();
                goto cleanup;
            }
            print_leds(state);
        }
    }

    disable_raw_mode();
cleanup:
    printf("\ndisabling bitbang mode\n");
    ftdi_disable_bitbang(ftdi);
    ftdi_usb_close(ftdi);
    ftdi_free(ftdi);

    return 0;
}
