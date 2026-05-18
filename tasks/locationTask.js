import * as TaskManager from 'expo-task-manager';
import api from '../services/api';
import { carregarMotoboy, carregarSlug } from '../store/authStore';

export const LOCATION_TASK_NAME = 'nex-bg-location';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.log('[GPS-BG] erro na task:', error.message);
    return;
  }

  const { locations } = data;
  const loc = locations?.[0];
  if (!loc) return;

  try {
    const mb = await carregarMotoboy();
    const slug = await carregarSlug();
    if (!mb || !slug) return;

    await api.post(`/motoboy/${mb._id}/localizacao`, {
      restauranteSlug: slug,
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
    });
  } catch (e) {
    console.log('[GPS-BG] falha ao enviar:', e.message);
  }
});