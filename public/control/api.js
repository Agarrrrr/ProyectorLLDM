export async function request(url, options) {
  const response = await window.fetch(url, options);
  if (!response.ok) {
    const body = await response.clone().json().catch(() => ({}));
    throw Object.assign(new Error(body.error || `No se pudo completar la solicitud (${response.status}).`), { status: response.status });
  }
  return response;
}
