<script setup lang="ts">
import { computed } from 'vue';
import type { Spool } from '../lib/types';
import { normalizeHex, readableTextColor } from '../lib/colors';

const props = defineProps<{ spool: Spool }>();
const emit = defineEmits<{ (e: 'select', spool: Spool): void }>();

const hex = computed(() => '#' + normalizeHex(props.spool.color.hex));
const chipText = computed(() => readableTextColor(hex.value));

// Concentric winding rings (radii) that rotate slightly on hover.
const windings = [21, 26, 31, 36, 41];

// How many faint reels to peek out behind the main one (caps at 2).
const stack = computed(() => Math.max(0, Math.min(props.spool.count - 1, 2)));

const ariaLabel = computed(() => {
  const s = props.spool;
  const c = s.count > 1 ? `, ${s.count} spools` : '';
  const col = s.color.name ? `${s.color.name} ` : '';
  return `${col}${s.manufacturer} ${s.name}, ${s.type}${c}. Edit.`;
});
</script>

<template>
  <button class="spool" :aria-label="ariaLabel" @click="emit('select', spool)">
    <svg class="reel" viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <radialGradient :id="`sheen-${spool.id}`" cx="36%" cy="28%" r="78%">
          <stop offset="0%" stop-color="#fff" stop-opacity="0.26" />
          <stop offset="42%" stop-color="#fff" stop-opacity="0.05" />
          <stop offset="100%" stop-color="#fff" stop-opacity="0" />
        </radialGradient>
      </defs>

      <!-- Reels stacked behind, to imply "I own several". -->
      <g v-for="n in stack" :key="n" :transform="`translate(${n * 6} ${n * -5})`">
        <circle cx="60" cy="60" r="47" :fill="hex" />
        <circle cx="60" cy="60" r="47" fill="rgba(0,0,0,0.34)" />
        <circle cx="60" cy="60" r="47" fill="none" stroke="rgba(0,0,0,0.45)" stroke-width="2" />
      </g>

      <!-- Main reel -->
      <g class="reel-body">
        <circle cx="60" cy="60" r="47" :fill="hex" />

        <g class="winding">
          <circle
            v-for="(r, i) in windings"
            :key="r"
            cx="60"
            cy="60"
            :r="r"
            fill="none"
            :stroke="i % 2 === 0 ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.11)'"
            stroke-width="2.4"
          />
        </g>

        <!-- Plastic flange sheen + edges -->
        <circle cx="60" cy="60" r="47" :fill="`url(#sheen-${spool.id})`" />
        <circle cx="60" cy="60" r="47" fill="none" stroke="rgba(0,0,0,0.38)" stroke-width="2.5" />
        <circle cx="60" cy="60" r="44.5" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.2" />

        <!-- Hub / core with center hole -->
        <circle cx="60" cy="60" r="18" fill="#d4c39c" />
        <circle cx="60" cy="60" r="18" fill="none" stroke="rgba(0,0,0,0.3)" stroke-width="1.5" />
        <circle cx="60" cy="60" r="8.5" fill="#1b1610" />
        <circle cx="60" cy="60" r="8.5" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1" />

        <!-- Specular glint -->
        <ellipse cx="42" cy="38" rx="10" ry="6" fill="rgba(255,255,255,0.22)" transform="rotate(-32 42 38)" />
      </g>

      <!-- Count badge -->
      <g v-if="spool.count > 1" class="badge">
        <circle cx="100" cy="20" r="14" fill="#d7a94e" stroke="#1c1407" stroke-width="1.5" />
        <text x="100" y="25" text-anchor="middle" font-size="14" font-weight="700" fill="#1c1407">
          ×{{ spool.count }}
        </text>
      </g>
    </svg>

    <!-- Hanging kraft tag (HTML for clean text handling) -->
    <span class="tag">
      <span class="tag-chip" :style="{ background: hex, color: chipText }"></span>
      <span class="tag-text">
        <span class="tag-color">{{ spool.color.name || 'No color' }}</span>
        <span class="tag-name">{{ spool.name || 'Untitled' }}</span>
        <span class="tag-maker">{{ spool.manufacturer || '—' }}</span>
      </span>
    </span>
  </button>
</template>

<style scoped>
.spool {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  width: 153px;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--font-mono);
}

.reel {
  width: 135px;
  height: 135px;
  filter: drop-shadow(0 8px 7px rgba(0, 0, 0, 0.5));
  transition: transform 0.16s ease;
}
.reel-body {
  transform-origin: 60px 60px;
}
.winding {
  transform-box: fill-box;
  transform-origin: center;
  transition: transform 0.5s cubic-bezier(0.2, 0.7, 0.2, 1);
}

.spool:hover .reel,
.spool:focus-visible .reel {
  transform: translateY(-4px);
}
.spool:hover .winding,
.spool:focus-visible .winding {
  transform: rotate(20deg);
}
.spool:focus-visible {
  outline: none;
}
.spool:focus-visible .tag {
  outline: 2px solid var(--color-brass);
  outline-offset: 2px;
}

/* Kraft tag tied below the reel */
.tag {
  position: relative;
  margin-top: -6px;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  max-width: 150px;
  padding: 0.28rem 0.45rem 0.28rem 0.4rem;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(0, 0, 0, 0.06)),
    var(--color-kraft);
  color: #2a2012;
  border: 1px solid var(--color-kraft-line);
  border-radius: 3px;
  box-shadow: 0 4px 8px -4px rgba(0, 0, 0, 0.6);
  transform: rotate(-1.5deg);
}
/* punched hole + string */
.tag::before {
  content: '';
  position: absolute;
  top: -7px;
  left: 12px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #1b1610;
  box-shadow: 0 -5px 0 -1px var(--color-kraft-line);
}
.tag-chip {
  flex: none;
  width: 11px;
  height: 11px;
  border-radius: 2px;
  border: 1px solid rgba(0, 0, 0, 0.35);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4);
}
.tag-text {
  display: flex;
  flex-direction: column;
  line-height: 1.05;
  min-width: 0;
}
.tag-color {
  font-size: 0.8rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tag-name {
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tag-maker {
  font-size: 0.68rem;
  color: #6b5631;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
