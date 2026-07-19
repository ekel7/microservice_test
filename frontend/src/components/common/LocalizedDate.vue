<template>
  <time :datetime="utcDateString" :title="tooltipText">
    {{ formattedDate }}
  </time>
</template>

<script>
import { computed } from 'vue'
import { 
  formatDate, 
  formatDateTime, 
  formatRelativeTime,
  formatGracePeriodDate,
  getBrowserTimezone
} from '../../utils/dateFormat.js'

export default {
  name: 'LocalizedDate',
  props: {
    // UTC date string from the backend
    date: {
      type: String,
      required: true
    },
    // Format type: 'date', 'datetime', 'relative', 'grace-period'
    format: {
      type: String,
      default: 'date',
      validator: (value) => ['date', 'datetime', 'relative', 'grace-period'].includes(value)
    },
    // Show timezone in tooltip
    showTimezone: {
      type: Boolean,
      default: true
    },
    // Additional Intl.DateTimeFormat options
    options: {
      type: Object,
      default: () => ({})
    }
  },
  setup(props) {
    const formattedDate = computed(() => {
      if (!props.date) return '';
      
      switch (props.format) {
        case 'datetime':
          return formatDateTime(props.date, props.options);
        case 'relative':
          return formatRelativeTime(props.date);
        case 'grace-period':
          return formatGracePeriodDate(props.date);
        case 'date':
        default:
          return formatDate(props.date, props.options);
      }
    });

    const tooltipText = computed(() => {
      if (!props.date) return '';
      
      const parts = [];
      
      // Always show full datetime in tooltip
      const fullDateTime = formatDateTime(props.date);
      parts.push(fullDateTime);
      
      // Add timezone info if requested
      if (props.showTimezone) {
        const timezone = getBrowserTimezone();
        parts.push(`(${timezone})`);
      }
      
      return parts.join(' ');
    });

    const utcDateString = computed(() => props.date);

    return {
      formattedDate,
      tooltipText,
      utcDateString
    };
  }
}
</script>

<style scoped>
time {
  cursor: help;
}

time:hover {
  text-decoration: underline;
}
</style>