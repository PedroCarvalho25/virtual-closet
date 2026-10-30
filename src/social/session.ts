import { useAuth } from '@/stores/auth';
let generation = 0;
useAuth.subscribe((state, previous) => {
  if (state.session?.user.id !== previous.session?.user.id) generation++;
});
export const socialSession = () => generation;
