<script>
  let {
    options = [{ value: 'none', text: 'No Options!' }],
    value = $bindable(),
    children = undefined,
    onchange = undefined,
    i18n_title,
    disabled = false,
  } = $props();
</script>

<div class="dropdown dropdown-dark">
    <select class="dropdown-select" bind:value {disabled} {onchange} {i18n_title} >
    {#if children}
        {@render children()}
    {:else}
        {#each options as {value, i18n, text = " "}(value)}
            <option {value} {i18n}>{text}</option>
        {/each}
    {/if}
    </select>
</div>

<style>
/*
 * Copyright (c) 2012-2013 Thibaut Courouble
 * http://www.cssflow.com
 *
 * Licensed under the MIT License:
 * http://www.opensource.org/licenses/mit-license.php
 */

.dropdown {
  position: relative;
  overflow: hidden;
  height: 20px;
  background: #fff;
  background-image: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.06));
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.08);
  margin-bottom:7px;
  border: 1px solid;
  border-color: #ccc #ccc #ccc;
  border-radius: 3px;
}

.dropdown:before, .dropdown:after {
  content: '';
  position: absolute;
  z-index: 2;
  top: 7px;
  right: 7px;
  width: 0;
  height: 0;
  border: 4px dashed;
  border-color: #888 transparent;
  pointer-events: none;
}

.dropdown:before {
  border-bottom-style: solid;
  border-top: none;
    margin-top: -2px;

}

.dropdown:after {
  margin-top: 5px;
  border-top-style: solid;
  border-bottom: none;
}

.dropdown-select {
  position: relative;
  overflow:visible;
  width: 100% !important;
  margin-top:0px;
  padding: 1px 0px 6px 5px;
  margin-right: 18px;
  height: 23px;
  line-height: 20px;
  font-size: 12px;
  color: #62717a;
  text-shadow: 0 1px white;
  /* Fallback for IE 8 */
  background: #f2f2f2;
  /* "transparent" doesn't work with Opera */
  background: rgba(0, 0, 0, 0) !important;
  border: 0;
  border-radius: 0;
  appearance: none;
  -webkit-appearance: none;
}

.dropdown-select:focus {
  z-index: 3;
  width: 90%;
  color: #4fa619;
  outline: 0px solid #49aff2;
  outline: 0px solid -webkit-focus-ring-color;
  outline-offset: 5px;
  height:25px;
}

.dropdown-select > :global(option) {
  margin: 3px;
  text-shadow: none;
  background: #f2f2f2;
  border-radius: 3px;
  cursor: pointer;
}

.dropdown-dark {
  background: #636363; /* NEW2 */
  background: #3e403f; /* NEW */
  border-color: #111 #0a0a0a black;
  background-image: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.4));
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.1), 0 1px 1px rgba(0, 0, 0, 0.2);
  color:#a6a6a6;
  text-shadow:0px 1px rgba(0, 0, 0, 0.25);
}

.dropdown-dark:before {
  border-bottom-color: #aaa;
}

.dropdown-dark:after {
  border-top-color: #aaa;
}

.dropdown-dark .dropdown-select {
  color: #a6a6a6;
  text-shadow: 0 1px black;
  /* Fallback for IE 8 */
  background: #444;
}

.dropdown-dark .dropdown-select:focus {
  color: #fff;
}

.dropdown-dark .dropdown-select > :global(option) {
  background: #56ab1a;
  text-shadow: 0 1px rgba(0, 0, 0, 0.4);
}
</style>
