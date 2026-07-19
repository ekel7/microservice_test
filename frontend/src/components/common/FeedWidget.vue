<template>
  <div class="feed-widget">
    <div class="p-3 border-b border-gray-600 bg-hover">
      <h3 class="text-sm font-semibold text-primary">{{ t('feed.title') }}</h3>
    </div>
    <div class="relative">
      <iframe 
        src="https://feed.mikle.com/widget/v2/your-widget-id/" 
        :height="height" 
        :width="width" 
        frameborder="0" 
        scrolling="no"
        class="w-full"
      />
    </div>
  </div>
</template>

<script setup>
import { useI18n } from '../../i18n/composable'

// Props
const props = defineProps({
  height: {
    type: [String, Number],
    default: 600
  },
  width: {
    type: [String, Number],
    default: 400
  }
})

// Composables
const { t } = useI18n()
</script>

<style scoped>
.feed-widget {
  max-width: 100%;
  overflow: hidden;
}
</style>