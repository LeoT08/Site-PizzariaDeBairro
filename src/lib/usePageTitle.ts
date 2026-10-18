import { useEffect } from 'react'

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | Pizza do Bairro` : 'Pizza do Bairro | Pizzaria em Vargem Grande Paulista'
  }, [title])
}
