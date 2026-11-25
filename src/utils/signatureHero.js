// Published promotional banners are the only additional hero slides.
// Keep the original hero as slide zero; no fake campaigns or autoplay.
function httpUrl(value) {
  if(typeof value !== 'string' || !value.trim()) return '';
  try { const url=new URL(value.trim()); return ['http:','https:'].includes(url.protocol) && !url.username && !url.password ? url.href : ''; } catch { return ''; }
}
export function getSignatureCampaignSlides(banners) {
  if(!Array.isArray(banners)) return [];
  return banners.slice(0,4).flatMap(banner => {
    const image=httpUrl(banner?.image);
    const title=typeof banner?.title==='string'?banner.title.trim():'';
    if(!image||!title)return [];
    return [{image,title,subtitle:typeof banner.subtitle==='string'?banner.subtitle:'',link:httpUrl(banner.link)}];
  });
}
export function signatureSlideIndex(index,count) {
  return Number.isInteger(index)&&index>=0&&index<count?index:0;
}
