# Ušetři — mobilní aplikace

Expo (SDK 57) + React Native. Sdílí databázi i účty s webem ve složce `../usetri`.

## Spuštění

```bash
npm install
npx expo start
```

Pak načti QR kód v aplikaci **Expo Go** na telefonu. Počítač a telefon musí být na stejné Wi-Fi.

Klíče k Supabase jsou v `.env` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).
Soubor je v `.gitignore`, takže se necommituje.

## Nastavení Supabase (jinak přihlášení na telefonu skončí na localhostu)

Supabase po přihlášení přesměruje prohlížeč na adresu, kterou dostane od aplikace. Pokud ta adresa
**není na seznamu povolených**, použije se místo ní **Site URL** — a ta je nastavená na
`http://localhost:3000`, což je adresa webu na počítači. Telefon ji neotevře a přihlášení se nedokončí.

V Supabase → **Authentication → URL Configuration → Redirect URLs** přidej (stávající nech být):

```
exp://**        ← Expo Go během vývoje
usetri://**     ← až se appka sestaví nastvrdo
```

Týká se to přihlášení přes Google i potvrzovacího e-mailu po registraci.

Přesnou adresu, kterou tvůj telefon posílá, ukáže aplikace v chybové hlášce, když se Google nevrátí zpět.

## Struktura

```
App.tsx                  přepíná mezi přihlášením a domovskou obrazovkou podle session
src/lib/supabase.ts      klient; session se ukládá do SQLite, aby přežila zavření appky
src/lib/data.ts          dotazy do databáze (skupiny, přidání se, odchod)
src/screens/AuthScreen   přihlášení a registrace
src/screens/HomeScreen   úspora, tvoje skupiny, volná místa
src/components/ui.tsx    tlačítka, pole, hlášky, logo Google
src/theme.ts             barvy převzaté z webu
```

## Co appka zatím neumí

Zakládání nabídek — to se dělá na webu. V appce se k nabídkám jen přidáváš.
Platby nejsou napojené nikde.
