// Splits a string into text/number chunks so "2 - Intro" sorts before "10 - Setup".
function chunk(str) {
  return String(str)
    .match(/\d+|\D+/g) || [];
}

function naturalCompare(a, b) {
  const ac = chunk(a);
  const bc = chunk(b);
  const len = Math.min(ac.length, bc.length);

  for (let i = 0; i < len; i++) {
    const av = ac[i];
    const bv = bc[i];
    const aNum = /^\d+$/.test(av);
    const bNum = /^\d+$/.test(bv);

    if (aNum && bNum) {
      const diff = Number(av) - Number(bv);
      if (diff !== 0) return diff;
      if (av.length !== bv.length) return av.length - bv.length;
    } else {
      const cmp = av.localeCompare(bv, undefined, { sensitivity: 'base' });
      if (cmp !== 0) return cmp;
    }
  }
  return ac.length - bc.length;
}

module.exports = { naturalCompare };
