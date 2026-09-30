<script>
  import { i18n } from "@/js/i18n.js";
  import { i18n as legacyI18n } from "@/js/localization.js";

  let selectedLanguage = $state(legacyI18n.selectedLanguage);
  const languages = legacyI18n.getLanguagesAvailables();

  function selectLanguage(lang) {
    if (selectedLanguage === lang) return;
    legacyI18n.changeLanguage(lang);
    selectedLanguage = lang;
  }
</script>

<div class="landing">
  <div class="hero">
    <img
      class="logo logo-light"
      src="/images/cf_logo_black.svg"
      alt="Rotorflight"
    />
    <img
      class="logo logo-dark"
      src="/images/cf_logo_white.svg"
      alt="Rotorflight"
    />
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    <p>{@html $i18n.t("defaultWelcomeIntro")}</p>
  </div>

  <div class="columns">
    <div class="column">
      <section>
        <h2>{$i18n.t("defaultDownloadsHead")}</h2>
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        <div>{@html $i18n.t("defaultDownloadsText")}</div>
      </section>

      <section>
        <h2>{$i18n.t("defaultCommunityHead")}</h2>
        <p>{$i18n.t("defaultCommunityText")}</p>
        <ul class="social">
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          <li>{@html $i18n.t("defaultWebsiteText")}</li>
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          <li>{@html $i18n.t("defaultDiscordText")}</li>
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          <li>{@html $i18n.t("defaultFacebookText")}</li>
        </ul>
      </section>
    </div>

    <div class="column">
      <section>
        <h2>{$i18n.t("defaultContributingHead")}</h2>
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        <div>{@html $i18n.t("defaultContributingText")}</div>
      </section>
    </div>

    <div class="column">
      <section class="donate">
        <h2>{$i18n.t("defaultDonateHead")}</h2>
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        <div>{@html $i18n.t("defaultDonateText")}</div>
        <a
          class="donate-button"
          href="https://www.rotorflight.org/donate"
          target="_blank"
          rel="noopener noreferrer">Donate</a
        >
      </section>
    </div>
  </div>

  <div class="language-switcher">
    <span class="language-label">{$i18n.t("language_choice_message")}</span>
    <div class="languages">
      <button
        class:selected={selectedLanguage === "DEFAULT"}
        onclick={() => selectLanguage("DEFAULT")}
      >
        {$i18n.t("language_default_pretty")}
      </button>
      {#each languages as lang (lang)}
        <button
          class:selected={selectedLanguage === lang}
          onclick={() => selectLanguage(lang)}
        >
          {$i18n.t(`language_${lang}`)}
        </button>
      {/each}
    </div>
  </div>
</div>

<style lang="scss">
  .landing {
    height: 100%;
    overflow-y: auto;
    padding: var(--section-gap);
    color: var(--color-text);
    background-color: var(--color-bg);
  }

  /* Hero, columns and the language row are all the same card: the same
     surface, border, radius and elevation the rest of the app uses for a
     Section. The page used to invent its own palette instead - a paper
     texture behind the logo and a full-bleed --accent band behind the
     link columns - which is why it read as a different product. */
  @mixin card {
    border: 1px solid var(--color-border-soft);
    border-radius: var(--radius-md);
    background-color: var(--color-surface);

    :global(html[data-theme="light"]) & {
      box-shadow: var(--shadow-sm);
    }

    :global(html[data-theme="dark"]) & {
      border-color: var(--color-neutral-800);
    }
  }

  .hero {
    @include card;

    position: relative;
    overflow: hidden;
    padding: 32px 24px 28px;
    text-align: center;

    p {
      max-width: 900px;
      margin: 12px auto 0;
      font-size: 0.9rem;
      font-weight: 400;
      line-height: 1.65;
      color: var(--color-text-muted);
    }
  }

  /* Same accent hairline the tab header carries, so the welcome page is
     visibly part of the same chrome. */
  .hero::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(
      90deg,
      var(--color-accent-500),
      transparent 55%
    );
  }

  .logo {
    width: 100%;
    max-width: 420px;
    margin: 0 auto;
  }

  .logo-dark {
    display: none;
  }

  :global(html[data-theme="dark"]) .logo-light {
    display: none;
  }

  :global(html[data-theme="dark"]) .logo-dark {
    display: inline-block;
  }

  .columns {
    display: grid;
    grid-template-columns: 1fr 1fr minmax(240px, 0.8fr);
    align-items: start;
    gap: var(--section-gap);
    margin-top: var(--section-gap);
  }

  .column {
    display: flex;
    flex-direction: column;
    gap: var(--section-gap);
  }

  section {
    @include card;

    padding: 16px 18px;
    font-size: 0.85rem;
    line-height: 1.65;
    color: var(--color-text-soft);
  }

  h2 {
    margin-bottom: 10px;
    padding-bottom: 8px;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-text);
    border-bottom: 1px solid var(--color-border-soft);
  }

  .columns :global(a) {
    color: var(--color-accent-text);
    font-weight: 600;
    text-decoration: none;
    transition: color var(--animation-speed);
  }

  .columns :global(a:hover) {
    color: var(--color-accent-hover);
    text-decoration: underline;
  }

  .columns :global(ul) {
    margin: 10px 0 0 18px;
  }

  .columns :global(li) {
    padding: 3px 0;
    list-style: disc;
  }

  .social {
    margin-top: 8px;
  }

  .donate :global(p) {
    margin: 0 0 8px;
  }

  .columns .donate-button {
    display: block;
    margin-top: 12px;
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    background-color: var(--color-accent-500);
    color: var(--color-accent-fg);
    font-weight: 700;
    letter-spacing: 0.06em;
    text-align: center;
    text-transform: uppercase;
    text-decoration: none;
    transition: background-color var(--animation-speed);

    &:hover {
      background-color: var(--color-accent-hover);
      color: var(--color-accent-fg);
      text-decoration: none;
    }
  }

  .language-switcher {
    @include card;

    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: var(--section-gap);
    padding: 14px 18px;
    text-align: center;
  }

  .language-label {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .languages {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
  }

  .language-switcher button {
    padding: 3px 10px;
    line-height: 20px;
    border: 1px solid transparent;
    border-radius: var(--radius-pill);
    background-color: var(--color-surface-sunken);
    color: var(--color-text-muted);
    font-weight: 500;
    font-size: 0.8rem;
    cursor: pointer;
    white-space: nowrap;
    transition:
      background-color var(--animation-speed),
      color var(--animation-speed);
  }

  .language-switcher button:hover {
    background-color: var(--color-hover);
    color: var(--color-text);
  }

  .language-switcher button.selected {
    background-color: var(--color-accent-500);
    color: var(--color-accent-fg);
    font-weight: 600;
  }

  @media only screen and (max-width: 1100px) {
    .columns {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media only screen and (max-width: 575px) {
    .columns {
      grid-template-columns: 1fr;
    }

    .logo {
      width: auto;
    }
  }
</style>
