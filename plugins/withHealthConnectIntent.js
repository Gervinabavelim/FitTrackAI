const { withAndroidManifest } = require('@expo/config-plugins');

const HEALTH_CONNECT_ACTION = 'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE';

function addHealthConnectIntentFilter(manifest) {
  const application = manifest.manifest.application?.[0];
  const mainActivity = application?.activity?.find(
    (a) => a.$?.['android:name'] === '.MainActivity',
  );
  if (!mainActivity) return manifest;

  mainActivity['intent-filter'] = mainActivity['intent-filter'] || [];
  const already = mainActivity['intent-filter'].some((f) =>
    f.action?.some((act) => act.$?.['android:name'] === HEALTH_CONNECT_ACTION),
  );
  if (!already) {
    mainActivity['intent-filter'].push({
      action: [{ $: { 'android:name': HEALTH_CONNECT_ACTION } }],
    });
  }
  return manifest;
}

module.exports = function withHealthConnectIntent(config) {
  return withAndroidManifest(config, (cfg) => {
    cfg.modResults = addHealthConnectIntentFilter(cfg.modResults);
    return cfg;
  });
};
