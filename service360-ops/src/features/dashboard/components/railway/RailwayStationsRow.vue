<template>
  <div class="stations-row">
    <div class="station-info">
      <div class="station-name">{{ startStation }}</div>
    </div>
    <div class="station-info">
      <div class="station-name">{{ endStation }}</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  startStation: String,
  endStation: String
});
</script>

<style scoped>
.stations-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 0 8px;
}

.stations-row .station-info:first-child {
  text-align: left;
}

.stations-row .station-info:last-child {
  text-align: right;
}

.station-name {
  font-size: 13px;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 4px;
}
</style>
