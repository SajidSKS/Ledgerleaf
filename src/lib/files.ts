import { Capacitor } from "@capacitor/core";
export async function exportFile(
  filename: string,
  content: string,
  mime: string,
) {
  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ]);
    const file = await Filesystem.writeFile({
      directory: Directory.Cache,
      path: filename,
      data: content,
      encoding: Encoding.UTF8,
    });
    await Share.share({ title: filename, files: [file.uri] });
    return;
  }
  const url = URL.createObjectURL(new Blob([content], { type: mime })),
    anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
