<template>
  <ol class="space-y-3">
    <li v-for="step in 4" :key="step" class="flex gap-3">
      <span
        class="bg-accent-600/10 text-accent-700 dark:bg-accent-400/10 dark:text-accent-300 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-medium"
      >
        {{ step }}
      </span>
      <p class="text-ink-600 dark:text-ink-300 text-sm leading-relaxed">
        <template v-if="step === 1">Sign in to your Amazon / Audible account.</template>
        <template v-else-if="step === 2"> Go to <em>Manage your data</em> → <em>Request your data</em> → <em>Audible</em>. </template>
        <template v-else-if="step === 3"> Amazon emails you a download link. According to their notice this can take up to a month. </template>
        <template v-else>
          Drop the resulting
          <code class="bg-paper-200/70 dark:bg-ink-800 rounded px-1 py-0.5 font-mono text-[12px]">Audible.zip</code>
          onto Audiotrail.
        </template>
      </p>
    </li>
  </ol>
</template>
