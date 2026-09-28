<!--
  OpenStreetMap view with the craft position. The GPS tab drives it with
  postMessage: { action: "center", lat, lon }, "nofix", "zoom_in" and
  "zoom_out".
-->
<script>
  import { onDestroy, onMount } from "svelte";

  const DEFAULT_ZOOM = 16;
  const ICON = "/images/icons/cf_icon_position.png";
  const ICON_NOFIX = "/images/icons/cf_icon_position_nofix.png";

  // OpenLayers is loaded as a classic script by map.html
  const ol = globalThis.ol;

  let canvas;
  let map;
  let view;
  let position;
  let marker;

  const iconStyle = (src) =>
    new ol.style.Style({
      image: new ol.style.Icon({ anchor: [0.5, 1], scale: 0.5, src }),
    });

  const fixStyle = iconStyle(ICON);
  const noFixStyle = iconStyle(ICON_NOFIX);

  function onMessage(e) {
    try {
      switch (e.data?.action) {
        case "zoom_in":
          view.setZoom(view.getZoom() + 1);
          break;
        case "zoom_out":
          view.setZoom(view.getZoom() - 1);
          break;
        case "center": {
          const center = ol.proj.fromLonLat([e.data.lon, e.data.lat]);
          marker.setStyle(fixStyle);
          view.setCenter(center);
          position.setCoordinates(center);
          break;
        }
        case "nofix":
          marker.setStyle(noFixStyle);
          break;
      }
    } catch (err) {
      console.log(`Map error ${err}`);
    }
  }

  onMount(() => {
    const origin = ol.proj.fromLonLat([0, 0]);
    view = new ol.View({ center: origin, zoom: DEFAULT_ZOOM });
    position = new ol.geom.Point(origin);
    marker = new ol.Feature({ geometry: position });
    marker.setStyle(fixStyle);

    map = new ol.Map({
      target: canvas,
      layers: [
        new ol.layer.Tile({ source: new ol.source.OSM() }),
        new ol.layer.Vector({
          source: new ol.source.Vector({ features: [marker] }),
        }),
      ],
      view,
      controls: [],
    });
  });

  onDestroy(() => map?.setTarget(null));
</script>

<svelte:window onmessage={onMessage} />

<div class="map" bind:this={canvas}></div>

<style>
  :global(html),
  :global(body),
  :global(#app) {
    height: 100%;
    margin: 0;
    padding: 0;
  }

  .map {
    height: 100%;
  }
</style>
