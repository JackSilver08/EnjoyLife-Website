"use client";

import {useEffect} from "react";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Home-only, progressive enhancement: all text, navigation and product links
 * are rendered by the server and remain usable when JS or motion is disabled.
 * Scroll work is coalesced into one requestAnimationFrame per frame.
 */
export function HomeCinematicMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".home-cinematic");
    if (!root) return;

    const hero = root.querySelector<HTMLElement>(".hero-editorial");
    const heroPhoto = root.querySelector<HTMLElement>("[data-cinematic-hero-photo]");
    const heroCopy = root.querySelector<HTMLElement>("[data-cinematic-hero-copy]");
    const heroAtmosphere = root.querySelector<HTMLElement>("[data-cinematic-hero-atmosphere]");
    const heroMeta = root.querySelectorAll<HTMLElement>(".hero-topline,.hero-bottom");
    const story = root.querySelector<HTMLElement>(".home-story");
    const storyPhoto = root.querySelector<HTMLElement>("[data-cinematic-story-photo]");
    const storyCopy = root.querySelector<HTMLElement>("[data-cinematic-story-copy]");
    const contact = root.querySelector<HTMLElement>(".home-contact");
    const contactTitle = root.querySelector<HTMLElement>("[data-cinematic-contact-title]");
    const revealElements = Array.from(root.querySelectorAll<HTMLElement>(
      "[data-cinematic-reveal], .latest-editorial-item, .journal-article-card"
    ));

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compact = window.matchMedia("(max-width: 767px)");
    let frame = 0;
    let observer: IntersectionObserver | null = null;
    let active = false;

    const reveal = (element: HTMLElement) => {
      element.setAttribute("data-cinematic-revealed", "true");
    };

    const render = () => {
      frame = 0;
      if (!active) return;

      const viewport = window.innerHeight || 1;
      const intensity = compact.matches ? 0.32 : 1;

      if (hero && heroPhoto && heroCopy) {
        const bounds = hero.getBoundingClientRect();
        if (bounds.bottom > 0 && bounds.top < viewport) {
          const travel = clamp(-bounds.top, 0, bounds.height);
          const progress = clamp(travel / Math.max(bounds.height, 1), 0, 1);
          heroPhoto.style.setProperty("--cinematic-hero-image-y", `${Math.round(travel * 0.16 * intensity)}px`);
          heroCopy.style.setProperty("--cinematic-hero-copy-y", `${Math.round(-travel * 0.17 * intensity)}px`);
          heroCopy.style.setProperty("--cinematic-hero-copy-opacity", String(1 - progress * 0.75));
          heroAtmosphere?.style.setProperty("--cinematic-atmosphere-y", `${Math.round(-travel * 0.29 * intensity)}px`);
          heroMeta.forEach((element) => {
            element.style.setProperty("--cinematic-hero-meta-opacity", String(1 - progress * 0.8));
          });
        }
      }

      if (story && storyPhoto && storyCopy) {
        const bounds = story.getBoundingClientRect();
        if (bounds.bottom > 0 && bounds.top < viewport) {
          const position = clamp((viewport - bounds.top) / (viewport + bounds.height), 0, 1);
          const offset = (0.5 - position) * 138 * intensity;
          storyPhoto.style.setProperty("--cinematic-story-photo-y", `${Math.round(offset)}px`);
          storyCopy.style.setProperty("--cinematic-story-copy-y", `${Math.round(-offset * 0.23)}px`);
        }
      }

      if (contact && contactTitle) {
        const bounds = contact.getBoundingClientRect();
        if (bounds.bottom > 0 && bounds.top < viewport) {
          const progress = clamp((viewport - bounds.top) / (viewport + bounds.height), 0, 1);
          contactTitle.style.setProperty("--cinematic-contact-y", `${Math.round((0.5 - progress) * 65 * intensity)}px`);
        }
      }
    };

    const schedule = () => {
      if (active && frame === 0) frame = window.requestAnimationFrame(render);
    };

    const start = () => {
      if (reduced.matches || active) return;
      active = true;

      if ("IntersectionObserver" in window) {
        observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              reveal(entry.target as HTMLElement);
              observer?.unobserve(entry.target);
            }
          });
        }, {threshold: 0.08, rootMargin: "0px 0px -5% 0px"});

        revealElements.forEach((element) => {
          const bounds = element.getBoundingClientRect();
          if (bounds.top < window.innerHeight * 0.92 && bounds.bottom > 0) reveal(element);
          else observer?.observe(element);
        });
      } else {
        revealElements.forEach(reveal);
      }

      root.classList.add("is-cinematic-ready");
      schedule();
    };

    const stop = () => {
      active = false;
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      observer?.disconnect();
      observer = null;
      root.classList.remove("is-cinematic-ready");
      for (const element of [heroPhoto, heroCopy, heroAtmosphere, storyPhoto, storyCopy, contactTitle, ...heroMeta]) {
        if (!element) continue;
        for (const name of [
          "--cinematic-hero-image-y", "--cinematic-hero-copy-y",
          "--cinematic-hero-copy-opacity", "--cinematic-atmosphere-y",
          "--cinematic-hero-meta-opacity", "--cinematic-story-photo-y",
          "--cinematic-story-copy-y", "--cinematic-contact-y"
        ]) element.style.removeProperty(name);
      }
    };

    const onReducedChange = () => {
      if (reduced.matches) stop();
      else start();
    };

    const onFocus = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const element = target.closest<HTMLElement>(
        "[data-cinematic-reveal], .latest-editorial-item, .journal-article-card"
      );
      if (element) reveal(element);
    };

    window.addEventListener("scroll", schedule, {passive: true});
    window.addEventListener("resize", schedule);
    root.addEventListener("focusin", onFocus);
    reduced.addEventListener("change", onReducedChange);
    compact.addEventListener("change", schedule);
    start();

    return () => {
      stop();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      root.removeEventListener("focusin", onFocus);
      reduced.removeEventListener("change", onReducedChange);
      compact.removeEventListener("change", schedule);
    };
  }, []);

  return null;
}
