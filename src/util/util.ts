async function fetchImageToBase64(url: string) {
  if (!url) return undefined;
  const picture = await fetch(url, { signal: AbortSignal.timeout(5000) })
    .then(async (res) => Buffer.from(await res.arrayBuffer()))
    .catch((_) => undefined);
  if (!picture) return undefined;
  return Buffer.from(picture).toString("base64");
}

export { fetchImageToBase64 };
