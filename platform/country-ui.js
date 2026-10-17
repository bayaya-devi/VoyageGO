import { moroccoMarkup } from './morocco-ui.js';

const messages = {
  fr: { africa:'VoyageGo Afrique', ready:'Interface pays disponible', registry:'Référentiel vérifié', content:'Contenu éditorial en validation', preserved:'Socle Maroc conservé', services:'Services commerciaux inactifs', intro:'Une porte d’entrée dédiée, reliée au compte VoyageGo unique.', region:'Région VoyageGo', currency:'Devise de référence', zones:'Fuseaux horaires', next:'Ce qui est disponible', honest:'Aucune offre, disponibilité ou réservation n’est publiée sans partenaire et validation réels.', prepare:'Préparer un voyage', explore:'Explorer le registre mondial', groups:{north:'Afrique du Nord',west:'Afrique de l’Ouest',central:'Afrique centrale',east:'Afrique de l’Est',southern:'Afrique australe'}, sahara:'VoyageGo présente le Maroc et le Sahara occidental dans une même expérience de voyage. Le statut international du territoire est contesté ; cette distinction reste indiquée lorsque le contexte l’exige.' },
  en: { africa:'VoyageGo Africa', ready:'Country interface available', registry:'Registry verified', content:'Editorial content under review', preserved:'Morocco foundation preserved', services:'Commercial services inactive', intro:'A dedicated gateway connected to the single VoyageGo account.', region:'VoyageGo region', currency:'Reference currency', zones:'Time zones', next:'What is available', honest:'No offer, availability or booking is published without real partners and validation.', prepare:'Plan a trip', explore:'Explore the world registry', groups:{north:'North Africa',west:'West Africa',central:'Central Africa',east:'East Africa',southern:'Southern Africa'}, sahara:'VoyageGo presents Morocco and Western Sahara as one travel experience. The territory’s international status is disputed; that distinction remains visible whenever the context requires it.' },
  ar: { africa:'VoyageGo أفريقيا', ready:'واجهة البلد متاحة', registry:'السجل موثّق', content:'المحتوى التحريري قيد المراجعة', preserved:'تم الحفاظ على أساس المغرب', services:'الخدمات التجارية غير مفعّلة', intro:'بوابة مخصّصة مرتبطة بحساب VoyageGo الموحّد.', region:'منطقة VoyageGo', currency:'العملة المرجعية', zones:'المناطق الزمنية', next:'المتاح حالياً', honest:'لا تُنشر أي عروض أو إتاحة أو حجوزات من دون شركاء حقيقيين وتحقّق فعلي.', prepare:'خطّط لرحلة', explore:'استكشف السجل العالمي', groups:{north:'شمال أفريقيا',west:'غرب أفريقيا',central:'وسط أفريقيا',east:'شرق أفريقيا',southern:'الجنوب الأفريقي'}, sahara:'تقدّم VoyageGo المغرب والصحراء الغربية كتجربة سفر واحدة. الوضع الدولي للإقليم محل نزاع، ويظل هذا التمييز ظاهراً عندما يقتضي السياق ذلك.' },
  es: { africa:'VoyageGo África', ready:'Interfaz del país disponible', registry:'Registro verificado', content:'Contenido editorial en revisión', preserved:'Base de Marruecos conservada', services:'Servicios comerciales inactivos', intro:'Una puerta de entrada dedicada y conectada a la cuenta única de VoyageGo.', region:'Región VoyageGo', currency:'Moneda de referencia', zones:'Zonas horarias', next:'Qué está disponible', honest:'No se publica ninguna oferta, disponibilidad o reserva sin socios reales y validación.', prepare:'Preparar un viaje', explore:'Explorar el registro mundial', groups:{north:'África del Norte',west:'África Occidental',central:'África Central',east:'África Oriental',southern:'África Austral'}, sahara:'VoyageGo presenta Marruecos y el Sáhara Occidental como una sola experiencia de viaje. El estatus internacional del territorio está en disputa; esta distinción se mantiene visible cuando el contexto lo requiere.' },
  pt: { africa:'VoyageGo África', ready:'Interface do país disponível', registry:'Registo verificado', content:'Conteúdo editorial em revisão', preserved:'Base de Marrocos preservada', services:'Serviços comerciais inativos', intro:'Uma porta de entrada dedicada, ligada à conta única VoyageGo.', region:'Região VoyageGo', currency:'Moeda de referência', zones:'Fusos horários', next:'O que está disponível', honest:'Nenhuma oferta, disponibilidade ou reserva é publicada sem parceiros reais e validação.', prepare:'Preparar uma viagem', explore:'Explorar o registo mundial', groups:{north:'Norte de África',west:'África Ocidental',central:'África Central',east:'África Oriental',southern:'África Austral'}, sahara:'A VoyageGo apresenta Marrocos e o Saara Ocidental como uma única experiência de viagem. O estatuto internacional do território é contestado; esta distinção permanece visível quando o contexto o exige.' },
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[character]);

export function countryMarkup(country, locale, pageUrl) {
  if (country.iso2 === 'MA') return moroccoMarkup(locale, 'home', { place: new URL(location.href).searchParams.get('place') });
  const t = messages[locale];
  const contentLabel = country.contentStatus === 'published' ? t.preserved : t.content;
  return `<main id="main-content" class="platform-page country-experience" tabindex="-1" data-country-code="${country.iso2}">
    <section class="country-hero" aria-labelledby="country-title">
      <div class="country-flag-mark" aria-hidden="true">${country.flag}</div>
      <p class="eyebrow">${escapeHtml(t.africa)} · ${country.iso2}</p>
      <h1 id="country-title">${escapeHtml(country.names[locale])}</h1>
      <p class="country-intro">${escapeHtml(t.intro)}</p>
      <div class="country-statuses" aria-label="${escapeHtml(t.next)}"><span>${escapeHtml(t.ready)}</span><span>${escapeHtml(t.registry)}</span><span>${escapeHtml(contentLabel)}</span><span>${escapeHtml(t.services)}</span></div>
    </section>
    <section class="country-facts" aria-label="${escapeHtml(t.next)}">
      <div><span>${escapeHtml(t.region)}</span><strong>${escapeHtml(t.groups[country.group])}</strong></div>
      <div><span>${escapeHtml(t.currency)}</span><strong>${escapeHtml(country.currency)}</strong></div>
      <div><span>${escapeHtml(t.zones)}</span><strong>${country.timeZones.map(escapeHtml).join('<br>')}</strong></div>
    </section>
    ${country.iso2 === 'MA' ? `<aside class="territory-context">${escapeHtml(t.sahara)}</aside>` : ''}
    <section class="country-readiness"><p class="eyebrow">${escapeHtml(t.next)}</p><h2>${escapeHtml(contentLabel)}</h2><p>${escapeHtml(t.honest)}</p><div class="platform-actions"><a class="platform-primary" href="${pageUrl('prepare')}">${escapeHtml(t.prepare)}</a><a class="platform-secondary" href="${pageUrl('explore')}">${escapeHtml(t.explore)}</a></div></section>
  </main>`;
}
