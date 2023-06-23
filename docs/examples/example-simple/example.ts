import * as jsdraw from 'js-draw';
import 'js-draw/styles';

const editor = new jsdraw.Editor(document.body);
editor.addToolbar();

// TODO: DERIVED FROM MDN. REPLACE!!!
// See original: https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths
editor.loadFromSVG(`
<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
  <path d="M 10 315
  L 110 215
  A 30 50 0 0 1 162.6 162.5
  L 172.6 152.5
  A 30 50 -45 0 1 215 110
  L 315 10" stroke="red" stroke-width="3"/>
  <path d="M 110 215 l 1 1" stroke="green" stroke-width="6"/>
  <path d="M 162.55 162.45 l 1 1" stroke="orange" stroke-width="6"/>
  <path d="M 172.55 152.45 l 1 1" stroke="brown" stroke-width="6"/>
  <path d="M 215.1 109.9 l 1 1" stroke="purple" stroke-width="6"/>
</svg>
`);

/*
M 10 315
           L 110 215
           A 30 50 0 0 1 162.55 162.45
           L 172.55 152.45
           A 30 50 -45 0 1 215.1 109.9
           L 315 10
*/