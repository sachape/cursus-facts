/**
 * Marques du produit — mot-symbole horizontal et symbole seul.
 *
 * Inlinées plutôt qu'importées comme images : un tracé inline suit la couleur du
 * texte, s'échelonne avec lui, et ne provoque pas de requête supplémentaire.
 *
 * DEUX CORRECTIONS SUR LES FICHIERS D'ORIGINE.
 *
 * Les identifiants de masque et de découpe sont préfixés. Les deux fichiers
 * portaient les mêmes — `nvt`, `rct` — et un document contenant les deux marques
 * aurait vu l'un écraser l'autre : le masque de la seconde se serait appliqué à
 * la première, sans erreur ni avertissement.
 *
 * L'encre passe en `currentColor`. Figée à `#141414`, elle disparaissait en
 * thème sombre. L'anneau, lui, garde la couleur de la marque : c'est une
 * identité, pas une décision d'interface, et elle ne doit pas suivre le thème.
 */

export function MotSymboleHorizontal({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="-6 -6 449 112" role="img" aria-label="Formlist" className={className}>
      <svg x="0" y="0" width="100" height="100" viewBox="0 0 100 100" color="#4ECFA6">
  <defs>
    <mask id="fh-nvt"><rect width="100" height="100" fill="#fff"/><circle cx="23" cy="22" r="7" fill="#000"/></mask>
    <clipPath id="fh-rct"><circle cx="50" cy="50" r="39"/></clipPath>
  </defs>
  <circle cx="50" cy="50" r="44" fill="none" stroke="var(--marque-accent)" stroke-width="9" mask="url(#fh-nvt)"/>
  <g clip-path="url(#fh-rct)">
    <g fill="currentColor"><circle cx="54" cy="75" r="5.8"/><circle cx="64" cy="74" r="6.0"/><circle cx="72" cy="67" r="5.8"/><circle cx="76" cy="57" r="5.4"/><circle cx="76" cy="47" r="5.0"/><circle cx="73" cy="38" r="4.6"/><circle cx="68" cy="32" r="4.0"/><circle cx="62" cy="29" r="3.5"/><circle cx="57" cy="30" r="3.0"/></g>
    <g fill="currentColor">
      <path d="M31 31 C 28 18 35 16 40 25 C 42 29 41 33 38 34 Z"/>
      <path d="M61 31 C 64 18 57 16 52 25 C 50 29 51 33 54 34 Z"/>
    </g>
    <ellipse cx="45" cy="52" rx="25.5" ry="27" fill="currentColor"/>
    <path d="M33 29 C 32 22 37 22 38 28 Z" fill="currentColor"/>
    <path d="M59 29 C 60 22 55 22 54 28 Z" fill="currentColor"/>
    <ellipse cx="45" cy="56" rx="15.5" ry="15.5" fill="#FFFFFF"/>
    <path d="M33.5 52.5 C 36.5 56.5 40.5 56.5 43.5 52.5" fill="none" stroke="#141414" stroke-width="3.1" stroke-linecap="round"/>
    <path d="M46.5 52.5 C 49.5 56.5 53.5 56.5 56.5 52.5" fill="none" stroke="#141414" stroke-width="3.1" stroke-linecap="round"/>
    <ellipse cx="32.5" cy="61.5" rx="3.4" ry="2.4" fill="currentColor" opacity="0.9"/>
    <ellipse cx="57.5" cy="61.5" rx="3.4" ry="2.4" fill="currentColor" opacity="0.9"/>
    <path d="M41.5 60 C 41.5 57.6 45 57.6 45 59.6 C 45 57.6 48.5 57.6 48.5 60 C 48.5 62.4 45 64.4 45 64.4 C 45 64.4 41.5 62.4 41.5 60 Z" fill="currentColor"/>
    <path d="M45 64.2 v3.2" stroke="#141414" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
    <path d="M42.4 65.4 h5.2 a1.4 1.4 0 0 1 1.4 1.4 v2.4 a2.2 2.2 0 0 1 -2.2 2.2 h-3.6 a2.2 2.2 0 0 1 -2.2 -2.2 v-2.4 a1.4 1.4 0 0 1 1.4 -1.4 Z" fill="#FFFFFF"/>
    <line x1="45" y1="65.8" x2="45" y2="71" stroke="#141414" stroke-width="0.8" opacity="0.4"/>
  </g>
</svg><path d="M116 0V355H26V439L159 432V450Q131 459 112.5 476.5Q94 494 84.5 517.5Q75 541 75 568Q75 610 95.0 641.5Q115 673 151.5 690.5Q188 708 237 708Q278 708 311.0 697.5Q344 687 365 670L355 570Q334 587 306.0 598.0Q278 609 251 609Q219 609 198.5 589.5Q178 570 178 529Q178 504 186.0 487.0Q194 470 207.0 459.5Q220 449 233 443H358V355H222V0Z M682 -13Q607 -13 549.0 19.0Q491 51 458.5 112.0Q426 173 426 262Q426 353 460.0 413.0Q494 473 551.5 503.0Q609 533 681 533Q755 533 813.0 502.0Q871 471 904.5 410.0Q938 349 938 258Q938 168 904.5 107.5Q871 47 813.0 17.0Q755 -13 682 -13ZM686 73Q731 73 763.0 94.0Q795 115 812.0 156.0Q829 197 829 254Q829 313 811.0 355.5Q793 398 759.5 421.0Q726 444 678 444Q635 444 602.5 423.5Q570 403 553.0 362.5Q536 322 536 264Q536 173 576.0 123.0Q616 73 686 73Z M1059 0V271V520H1153L1148 340H1165Q1174 401 1193.0 444.0Q1212 487 1245.0 509.5Q1278 532 1327 532Q1337 532 1349.0 531.0Q1361 530 1376 525L1371 411Q1356 417 1340.0 419.5Q1324 422 1311 422Q1271 422 1243.0 399.5Q1215 377 1196.5 337.5Q1178 298 1168 246V0Z M1470 0V326V520H1562L1556 358H1574Q1587 417 1609.5 455.5Q1632 494 1664.5 513.5Q1697 533 1740 533Q1788 533 1819.5 510.0Q1851 487 1867.5 448.0Q1884 409 1885 360H1901Q1914 417 1937.5 455.5Q1961 494 1996.0 513.5Q2031 533 2074 533Q2115 533 2146.0 516.5Q2177 500 2198.0 468.0Q2219 436 2229.5 388.5Q2240 341 2240 279V0H2131V265Q2131 323 2121.0 361.0Q2111 399 2090.0 418.0Q2069 437 2037 437Q2001 437 1973.5 412.5Q1946 388 1929.0 345.0Q1912 302 1908 246V0H1801V258Q1801 318 1791.0 357.5Q1781 397 1760.0 417.0Q1739 437 1707 437Q1669 437 1641.5 411.5Q1614 386 1598.0 342.0Q1582 298 1578 243V0Z M2382 0V705H2489V0Z M2639 0V520H2747V0ZM2693 607Q2658 607 2640.0 621.5Q2622 636 2622 665Q2622 693 2640.0 708.0Q2658 723 2693 723Q2729 723 2747.0 708.0Q2765 693 2765 665Q2765 636 2747.0 621.5Q2729 607 2693 607Z M3096 -13Q3042 -13 3000.0 -2.0Q2958 9 2928.5 29.5Q2899 50 2883.0 79.0Q2867 108 2864 142L2952 171Q2952 142 2970.0 119.0Q2988 96 3021.5 83.5Q3055 71 3102 71Q3157 71 3187.0 89.0Q3217 107 3217 139Q3217 163 3200.5 177.0Q3184 191 3153.5 200.0Q3123 209 3082 217Q3045 225 3008.5 235.5Q2972 246 2941.5 263.0Q2911 280 2892.5 307.5Q2874 335 2874 377Q2874 425 2899.0 459.5Q2924 494 2971.5 513.5Q3019 533 3085 533Q3149 533 3195.5 514.0Q3242 495 3270.0 461.0Q3298 427 3304 381L3212 354Q3210 385 3193.5 406.0Q3177 427 3149.0 437.5Q3121 448 3083 448Q3033 448 3004.5 430.0Q2976 412 2976 381Q2976 357 2993.5 342.5Q3011 328 3041.5 319.5Q3072 311 3111 303Q3151 295 3188.0 285.0Q3225 275 3254.5 258.5Q3284 242 3301.5 214.5Q3319 187 3319 145Q3319 94 3291.5 58.5Q3264 23 3214.0 5.0Q3164 -13 3096 -13Z M3605 -11Q3528 -11 3490.5 31.0Q3453 73 3453 160V431H3376L3378 520H3428Q3454 520 3467.0 528.5Q3480 537 3483 559L3493 636H3558V520H3701V429H3558V163Q3558 124 3576.0 107.0Q3594 90 3629 90Q3648 90 3667.5 94.5Q3687 99 3705 112V7Q3675 -3 3650.0 -7.0Q3625 -11 3605 -11Z" fill="currentColor" transform="translate(113.82,79.82) scale(0.08400,-0.08400)"/>
    </svg>
  );
}

export function Symbole({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="Formlist" className={className}>
      <defs>
    <mask id="fs-nvt"><rect width="100" height="100" fill="#fff"/><circle cx="23" cy="22" r="7" fill="#000"/></mask>
    <clipPath id="fs-rct"><circle cx="50" cy="50" r="39"/></clipPath>
  </defs>
  <circle cx="50" cy="50" r="44" fill="none" stroke="var(--marque-accent)" stroke-width="9" mask="url(#fs-nvt)"/>
  <g clip-path="url(#fs-rct)">
    <g fill="currentColor"><circle cx="54" cy="75" r="5.8"/><circle cx="64" cy="74" r="6.0"/><circle cx="72" cy="67" r="5.8"/><circle cx="76" cy="57" r="5.4"/><circle cx="76" cy="47" r="5.0"/><circle cx="73" cy="38" r="4.6"/><circle cx="68" cy="32" r="4.0"/><circle cx="62" cy="29" r="3.5"/><circle cx="57" cy="30" r="3.0"/></g>
    <g fill="currentColor">
      <path d="M31 31 C 28 18 35 16 40 25 C 42 29 41 33 38 34 Z"/>
      <path d="M61 31 C 64 18 57 16 52 25 C 50 29 51 33 54 34 Z"/>
    </g>
    <ellipse cx="45" cy="52" rx="25.5" ry="27" fill="currentColor"/>
    <path d="M33 29 C 32 22 37 22 38 28 Z" fill="currentColor"/>
    <path d="M59 29 C 60 22 55 22 54 28 Z" fill="currentColor"/>
    <ellipse cx="45" cy="56" rx="15.5" ry="15.5" fill="#FFFFFF"/>
    <path d="M33.5 52.5 C 36.5 56.5 40.5 56.5 43.5 52.5" fill="none" stroke="#141414" stroke-width="3.1" stroke-linecap="round"/>
    <path d="M46.5 52.5 C 49.5 56.5 53.5 56.5 56.5 52.5" fill="none" stroke="#141414" stroke-width="3.1" stroke-linecap="round"/>
    <ellipse cx="32.5" cy="61.5" rx="3.4" ry="2.4" fill="currentColor" opacity="0.9"/>
    <ellipse cx="57.5" cy="61.5" rx="3.4" ry="2.4" fill="currentColor" opacity="0.9"/>
    <path d="M41.5 60 C 41.5 57.6 45 57.6 45 59.6 C 45 57.6 48.5 57.6 48.5 60 C 48.5 62.4 45 64.4 45 64.4 C 45 64.4 41.5 62.4 41.5 60 Z" fill="currentColor"/>
    <path d="M45 64.2 v3.2" stroke="#141414" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
    <path d="M42.4 65.4 h5.2 a1.4 1.4 0 0 1 1.4 1.4 v2.4 a2.2 2.2 0 0 1 -2.2 2.2 h-3.6 a2.2 2.2 0 0 1 -2.2 -2.2 v-2.4 a1.4 1.4 0 0 1 1.4 -1.4 Z" fill="#FFFFFF"/>
    <line x1="45" y1="65.8" x2="45" y2="71" stroke="#141414" stroke-width="0.8" opacity="0.4"/>
  </g>
    </svg>
  );
}
