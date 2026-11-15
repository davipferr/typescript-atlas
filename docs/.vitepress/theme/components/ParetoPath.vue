<script setup lang="ts">
import { withBase } from 'vitepress'
import { data } from '../../../features.data'
import { paretoSteps, paretoLater } from '../../pareto'

// Index every page of the atlas by link so the path can resolve titles to anchors.
const pages = new Map(
  data.flatMap((section) =>
    section.pages.map((page) => [page.link, { ...page, icon: section.icon, section: section.text }])
  )
)

const total = data.reduce((n, s) => n + s.pages.reduce((m, p) => m + p.features.length, 0), 0)

const steps = paretoSteps.map((step) => ({
  ...step,
  reads: step.reads.map((read) => {
    const page = pages.get(read.page)
    return {
      link: read.page,
      text: page?.text ?? read.page,
      icon: page?.icon ?? '',
      features: read.features.map((title) => {
        const found = page?.features.find((f) => f.title === title)
        return { title, link: found?.link, summary: found?.summary ?? '' }
      })
    }
  })
}))

const picked = steps.reduce((n, s) => n + s.reads.reduce((m, r) => m + r.features.length, 0), 0)
const missing = steps.flatMap((s) => s.reads.flatMap((r) => r.features.filter((f) => !f.link)))
if (missing.length) {
  console.warn('[ParetoPath] features not found:', missing.map((f) => f.title))
}

const later = paretoLater.map((item) => {
  const page = pages.get(item.page)
  return { ...item, text: page?.text ?? item.page, icon: page?.icon ?? '' }
})
</script>

<template>
  <div class="pareto">
    <p class="ratio">
      <strong>{{ picked }}</strong> of <strong>{{ total }}</strong> features
      ({{ Math.round((picked / total) * 100) }}%), in {{ steps.length }} steps.
    </p>

    <ol class="steps">
      <li v-for="(step, i) in steps" :key="step.title" class="step">
        <div class="num" aria-hidden="true">{{ i + 1 }}</div>
        <div class="body">
          <h2 :id="`step-${i + 1}`">{{ step.title }}</h2>
          <p class="goal"><span>Goal</span> {{ step.goal }}</p>
          <p class="why"><span>Why it is in the 20%</span> {{ step.why }}</p>

          <div v-for="read in step.reads" :key="read.link + read.features[0].title" class="read">
            <a class="page" :href="withBase(read.link)">
              <span aria-hidden="true">{{ read.icon }}</span> {{ read.text }}
            </a>
            <ul>
              <li v-for="f in read.features" :key="f.title">
                <a v-if="f.link" :href="withBase(f.link)">{{ f.title }}</a>
                <span v-else class="missing">{{ f.title }} (not found)</span>
                <span v-if="f.summary" class="summary"> — {{ f.summary }}</span>
              </li>
            </ul>
          </div>
        </div>
      </li>
    </ol>

    <h2 id="later" class="later-title">Leave for later</h2>
    <p class="later-intro">
      The other 80%. Every feature here is real and useful, but you will rarely need it in your
      first months. Come back when a project asks for it.
    </p>
    <ul class="later">
      <li v-for="item in later" :key="item.page">
        <a :href="withBase(item.page)"><span aria-hidden="true">{{ item.icon }}</span> {{ item.text }}</a>
        <span class="summary"> — {{ item.why }}</span>
      </li>
      <li>
        <span class="summary">
          Everything else on the pages above that is not in the path, including the
          <span class="extra">extra</span> items in the <a :href="withBase('/features')">Feature Index</a>.
        </span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.ratio {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-size: 14px;
}
.steps {
  list-style: none;
  padding: 0 !important;
  margin: 24px 0 0 !important;
}
.step {
  display: flex;
  gap: 16px;
  margin: 0 !important;
  padding-bottom: 8px;
  position: relative;
}
/* the line connecting the step numbers */
.step:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 17px;
  top: 40px;
  bottom: 0;
  width: 2px;
  background: var(--vp-c-divider);
}
.num {
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 15px;
  color: var(--vp-button-brand-text);
  background: var(--vp-button-brand-bg);
}
.body {
  flex: 1;
  min-width: 0;
  padding-bottom: 24px;
}
.body h2 {
  margin: 4px 0 10px !important;
  padding: 0 !important;
  border: none !important;
  font-size: 20px;
}
.goal,
.why {
  margin: 4px 0 !important;
  font-size: 15px;
  line-height: 1.6;
}
.goal span,
.why span {
  display: inline-block;
  margin-right: 6px;
  padding: 0 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  vertical-align: 1px;
}
.goal span {
  color: var(--vp-c-green-1);
  background: var(--vp-c-green-soft);
}
.why span {
  color: var(--vp-c-text-2);
  background: var(--vp-c-default-soft);
}
.read {
  margin-top: 14px;
  padding: 12px 16px;
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
}
.page {
  font-weight: 600;
}
.read ul {
  margin: 6px 0 0 !important;
}
.read li {
  margin: 4px 0;
}
.summary {
  color: var(--vp-c-text-2);
  font-size: 14px;
}
.missing {
  color: var(--vp-c-danger-1);
}
.later-title {
  margin-top: 40px !important;
}
.later li {
  margin: 6px 0;
}
.extra {
  display: inline-block;
  padding: 0 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
  color: var(--vp-c-green-1);
  background: var(--vp-c-green-soft);
}
@media (max-width: 640px) {
  .step {
    gap: 12px;
  }
  .num {
    width: 30px;
    height: 30px;
    font-size: 13px;
  }
  .step:not(:last-child)::before {
    left: 14px;
    top: 34px;
  }
  .read {
    padding: 10px 12px;
  }
}
</style>
