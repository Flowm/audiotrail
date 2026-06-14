import { createRouter, createWebHashHistory } from "vue-router";

import { useTakeoutStore } from "@/stores/takeout";
import UploadView from "@/views/UploadView.vue";

declare module "vue-router" {
  interface RouteMeta {
    /** Redirect to the upload page when no takeout is loaded. */
    requiresData?: boolean;
    /** 'bare' routes render without the sidebar shell. */
    layout?: "bare";
  }
}

const router = createRouter({
  // Hash history keeps the built app deployable on any static host (and
  // even openable from file://) without server-side rewrites.
  history: createWebHashHistory(),
  routes: [
    { path: "/", name: "upload", component: UploadView, meta: { layout: "bare" } },
    {
      path: "/overview",
      name: "overview",
      component: () => import("@/views/OverviewView.vue"),
      meta: { requiresData: true },
    },
    {
      path: "/listening",
      name: "listening",
      component: () => import("@/views/ListeningView.vue"),
      meta: { requiresData: true },
    },
    {
      path: "/library",
      name: "library",
      component: () => import("@/views/LibraryView.vue"),
      meta: { requiresData: true },
    },
    {
      path: "/people",
      name: "people",
      component: () => import("@/views/PeopleView.vue"),
      meta: { requiresData: true },
    },
    {
      path: "/money",
      name: "money",
      component: () => import("@/views/MoneyView.vue"),
      meta: { requiresData: true },
    },
    {
      path: "/extras",
      name: "extras",
      component: () => import("@/views/ExtrasView.vue"),
      meta: { requiresData: true },
    },
    {
      path: "/wrapped/:year?",
      name: "wrapped",
      component: () => import("@/views/WrappedView.vue"),
      meta: { requiresData: true, layout: "bare" },
    },
    { path: "/about", name: "about", component: () => import("@/views/AboutView.vue") },
    { path: "/:pathMatch(.*)*", redirect: { name: "upload" } },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach((to) => {
  if (!to.meta.requiresData) return;
  const takeout = useTakeoutStore();
  if (!takeout.hasData) return { name: "upload" };
});

export default router;
