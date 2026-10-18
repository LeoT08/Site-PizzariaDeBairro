/** Fica fora da cena para a checagem não puxar o three.js para o pacote principal */
export function supportsWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}
