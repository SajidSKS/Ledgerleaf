import { mkdir, writeFile, copyFile, access } from "node:fs/promises";
import { resolve } from "node:path";
const res = resolve("android/app/src/main/res");
await access(res);
const icon = resolve("public/icon-512.png");
for (const density of ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"]) {
  const folder = resolve(res, `mipmap-${density}`);
  await mkdir(folder, { recursive: true });
  await copyFile(icon, resolve(folder, "ic_launcher.png"));
  await copyFile(icon, resolve(folder, "ic_launcher_round.png"));
}
await mkdir(resolve(res, "drawable"), { recursive: true });
await writeFile(
  resolve(res, "drawable/ledgerleaf_launcher_foreground.xml"),
  `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
  <path android:strokeColor="#E5D9B8" android:strokeWidth="2.5" android:strokeLineCap="round" android:strokeLineJoin="round" android:fillColor="@android:color/transparent" android:pathData="M40,68C35,42 54,38 68,38C69,59 61,71 43,66M40,71L62,46M47,59L45,48M52,53L63,54"/>
</vector>`,
);
await mkdir(resolve(res, "values"), { recursive: true });
await writeFile(
  resolve(res, "values/ledgerleaf_icons.xml"),
  '<?xml version="1.0" encoding="utf-8"?><resources><color name="ledgerleaf_launcher_background">#344E41</color></resources>',
);
await mkdir(resolve(res, "mipmap-anydpi-v26"), { recursive: true });
for (const name of ["ic_launcher", "ic_launcher_round"])
  await writeFile(
    resolve(res, `mipmap-anydpi-v26/${name}.xml`),
    '<?xml version="1.0" encoding="utf-8"?><adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/ledgerleaf_launcher_background"/><foreground android:drawable="@drawable/ledgerleaf_launcher_foreground"/></adaptive-icon>',
  );
console.log("Ledgerleaf Android launcher icons prepared.");
