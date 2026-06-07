const TASKS = [
  {
    id: 17, title: "Moduł jądra – hello printk",
    desc: "Prosty moduł jądra Linux wyświetlający personalia przez printk.",
    pdf: "zadanie17/lab17.pdf", uruchomienie: "zadanie17/uruchomienie.txt",
    needsFields: { albumNumber: true, fullName: true },
    files: [{ name: "hello_printk.c", path: "zadanie17/hello_printk.c",
      subs: [{ from: "Kamil Suchy", to: "fullName" }, { from: "60859", to: "albumNumber" }]
    }]
  },
  {
    id: 18, title: "Sterowanie LED przez sysfs – kod Morse'a",
    desc: "Program migający diodą LED kodem Morse'a na podstawie inicjałów studenta.",
    pdf: "zadanie18/lab18.pdf", uruchomienie: "zadanie18/uruchomienie.txt",
    needsFields: { initials: true },
    files: [
      { name: "prog.c", path: "zadanie18/prog.c", morse: "full" },
      { name: "prog_krotki.c", path: "zadanie18/prog_krotki.c", morse: "short" }
    ]
  },
  {
    id: 19, title: "Sterownik GPIO (sysfs) – miganie LED",
    desc: "Program migający naprzemiennie czerwoną i zieloną diodą LED przez GPIO sysfs.",
    pdf: "zadanie19/lab19.pdf", uruchomienie: "zadanie19/uruchomienie.txt",
    files: [{ name: "prog.c", path: "zadanie19/prog.c" }]
  },
  {
    id: 20, title: "Sterownik GPIO (sysfs) – odczyt przyciskow",
    desc: "Program odczytujący stan przycisków (żółty i niebieski) przez GPIO sysfs.",
    pdf: "zadanie20/lab20.pdf", uruchomienie: "zadanie20/uruchomienie.txt",
    files: [{ name: "prog.c", path: "zadanie20/prog.c" }]
  },
  {
    id: 21, title: "Sterownik znakowy LED",
    desc: "Sterownik znakowy (character device) sterujący LED na podstawie inicjałów.",
    pdf: "zadanie21/lab21.pdf", uruchomienie: "zadanie21/uruchomienie.txt",
    needsFields: { fullName: true, initials: true },
    files: [
      { name: "led_char.c", path: "zadanie21/led_char.c",
        subs: [{ from: "'K'", to: "initial1" }, { from: "'S'", to: "initial2" }, { from: "Kamil Suchy", to: "fullName" }]
      },
      { name: "hello_led.c", path: "zadanie21/hello_led.c",
        subs: [{ from: "Phu Luu An", to: "fullName" }]
      }
    ]
  },
  {
    id: 22, title: "Sterownik blokowy",
    desc: "Sterownik blokowy zwracający numer indeksu po podaniu prawidłowego imienia i nazwiska.",
    pdf: "zadanie22/zad22.pdf", uruchomienie: "zadanie22/uruchomienie.txt",
    needsFields: { albumNumber: true, fullName: true },
    files: [{ name: "index_block.c", path: "zadanie22/index_block.c",
      subs: [{ from: "Kamil Suchy", to: "fullName" }, { from: "60859", to: "albumNumber" }]
    }]
  },
  {
    id: 23, title: "USB – libftdi1 i ft232r_prog",
    desc: "Odczyt konfiguracji układu FT232R (ft232r_prog) oraz unikalnego ID (libftdi1).",
    pdf: "zadanie23/lab23.pdf", uruchomienie: "zadanie23/uruchomienie.txt",
    downloads: [
      { name: "ft232r_prog-1.25.tar.gz", path: "zadanie23/ft232r_prog-1.25.tar.gz" },
      { name: "libftdi1-1.5.tar.bz2 (glowne)", path: "zadanie23/libftdi1-1.5.tar.bz2" },
      { name: "libftdi1-1.5.tar.bz2 (oryginalneArchiwum)", path: "zadanie23/oryginalneArchiwum/libftdi1-1.5.tar.bz2" }
    ]
  },
  {
    id: 24, title: "USB – libftdi1 bitbang CBUS",
    desc: "Sterowanie czterema diodami LED przez FTDI CBUS bitbang z poziomu klawiatury.",
    pdf: "zadanie24/lab24.pdf", uruchomienie: "zadanie24/uruchomienie.txt",
    files: [{ name: "bitbang_cbus.c", path: "zadanie24/bitbang_cbus.c" }],
    downloads: [
      { name: "libftdi1-1.5.tar.bz2 (glowne)", path: "zadanie24/libftdi1-1.5.tar.bz2" },
      { name: "libftdi1-1.5.tar.bz2 (oryginalneArchiwum)", path: "zadanie24/oryginalneArchiwum/libftdi1-1.5.tar.bz2" }
    ]
  },
  {
    id: 25, title: "Sterownik – obsługa przerwań",
    desc: "Sterownik obsługujący przerwania od przycisków GPIO68 (żółty) i GPIO69 (niebieski).",
    pdf: "zadanie25/zad25.pdf", uruchomienie: "zadanie25/uruchomienie.txt",
    needsFields: { fullName: true },
    files: [{ name: "interrupt_buttons.c", path: "zadanie25/interrupt_buttons.c",
      subs: [{ from: "Kamil Suchy", to: "fullName" }]
    }]
  },
  {
    id: 26, title: "Sterownik z timerem",
    desc: "Sterownik znakowy wysyłający komunikaty do dmesg co 1, 4 lub 8 sekund.",
    pdf: "zadanie26/zad26.pdf", uruchomienie: "zadanie26/uruchomienie.txt",
    needsFields: { fullName: true },
    files: [{ name: "timer_driver.c", path: "zadanie26/timer_driver.c",
      subs: [{ from: "Kamil Suchy", to: "fullName" }]
    }]
  },
  {
    id: 27, title: "procfs – sterownik /proc",
    desc: "Sterownik procfs zwracający imię i nazwisko oraz inkrementowany licznik odczytów.",
    pdf: "zadanie27/zad27.pdf", uruchomienie: "zadanie27/uruchomienie.txt",
    needsFields: { fullName: true },
    files: [{ name: "procfs_driver.c", path: "zadanie27/procfs_driver.c",
      subs: [{ from: "Kamil Suchy", to: "fullName" }]
    }]
  },
  {
    id: 28, title: "ioctl – odczyt danych przez ioctl",
    desc: "Sterownik znakowy udostępniający imię, nazwisko i nr indeksu przez ioctl. Program userspace odczytujący te dane.",
    pdf: "zadanie28/zad28.pdf", uruchomienie: "zadanie28/uruchomienie.txt",
    needsFields: { fullName: true, albumNumber: true },
    files: [
      { name: "ioctl_driver.c", path: "zadanie28/ioctl_driver.c",
        subs: [{ from: "Kamil Suchy", to: "fullName" }, { from: "Kamil", to: "firstName" }, { from: "Suchy", to: "surname" }, { from: "60859", to: "albumNumber" }]
      },
      { name: "ioctl_read.c", path: "zadanie28/ioctl_read.c" }
    ]
  }
];
