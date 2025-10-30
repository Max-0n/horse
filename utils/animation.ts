import type { Variant } from '@vueuse/motion'

export const variantsCardDrop3D = {
  initial: {
    opacity: 0,
    transform: 'scale(1.3)',
    filter: 'brightness(5) blur(10px)',
  },
  enter: {
    opacity: 1,
    transform: 'scale(1)',
    filter: 'brightness(1) blur(0px)',
  } as Variant,
}
