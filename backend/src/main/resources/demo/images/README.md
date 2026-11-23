# Zdjęcia ofert demo (opcjonalne)

`DemoDataSeeder` przy pierwszym seedzie dołącza do aktualnych ofert zdjęcia z tego katalogu.
Brak pliku nie jest błędem — frontend pokaże wtedy zastępczą grafikę (`/images/food-image.svg`).

Nazwa pliku = klucz oferty z `DemoCatalog.OFFERS`, rozszerzenie `jpg`, `jpeg`, `png` albo `webp`.
Drugie i trzecie zdjęcie tej samej oferty: przyrostek `-2`, `-3` (np. `zk-paczka-2.jpg`).

Zdjęcia są czytane tylko przy tworzeniu danych. Żeby dodać je do już zaseedowanej bazy,
trzeba zaseedować od nowa (patrz `docs/11_DEMO_SEED.md`).

Używaj zdjęć z licencją pozwalającą na użycie (własne, Unsplash, Pexels). Rozsądny rozmiar:
ok. 1200 px po dłuższym boku, < 300 KB — trafiają do obrazu Dockera.

Klucze:

| Sklep / osoba | Klucze |
|---|---|
| Zielony Koszyk | `zk-paczka` `zk-pomidory` `zk-banany` `zk-salata` `zk-jogurt` `zk-gouda` `zk-owsiane` `zk-kurczak` `zk-chleb` `zk-hummus` `zk-sok` `zk-makaron` `zk-karma` `zk-kanapki` |
| Piekarnia Złoty Kłos | `pk-chleb` `pk-drozdzowki` `pk-croissant` `pk-bagietki` `pk-sernik` `pk-bezgluten` |
| Bistro Pod Lipami | `bi-zupa` `bi-pierogi` `bi-lunchbox` `bi-salatka` `bi-ciasto` |
| Osoby prywatne | `pr-dynia` `pr-leczo` `pr-mleko` `pr-ryz` `pr-golabki` `pr-jablka` `pr-karma` `pr-czekolady` `pr-ziola` |
