import pb from '@/lib/pocketbaseClient';

const COLLECTION = 'app_config';

/**
 * Fetches the singleton app_config row (first record). Safe for unauthenticated
 * clients when list/view rules allow public read.
 */
export async function getAppConfig() {
  const list = await pb.collection(COLLECTION).getFullList({
    requestKey: null,
    $autoCancel: false,
  });
  return list[0] ?? null;
}

export { COLLECTION as APP_CONFIG_COLLECTION };
