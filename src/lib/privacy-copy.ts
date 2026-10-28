import type { Language } from "./language";
export const privacyCopy: Record<
  Language,
  {
    title: string;
    updated: string;
    draft: string;
    pending: string;
    providers: string;
    sections: string[][];
  }
> = {
  es: {
    title: "Política de privacidad",
    updated: "Actualizada el",
    draft: "Borrador pendiente de aprobación del responsable.",
    pending:
      "La política está pendiente de aprobación. Para consultas de privacidad, escribe a uzta.app@gmail.com.",
    providers: "Información de los proveedores",
    sections: [
      [
        "Responsable y contacto",
        "Cristian Martinez, persona física establecida en Francia, es el responsable del tratamiento de los datos de UZTA. Contacto para privacidad y ejercicio de derechos: uzta.app@gmail.com.",
      ],
      [
        "Datos utilizados",
        "Tratamos los datos que facilitas al crear o editar tu cuenta, tu correo, identificadores de acceso, idioma y localidad; tiendas, productos, fotografías, ubicación pública, favoritos, reservas, mensajes de recogida y valoraciones. Si usas Google, recibimos la identidad, el correo y los datos básicos de perfil que Google facilita, incluida la fotografía si la devuelve. Los proveedores técnicos pueden tratar direcciones IP y registros de acceso, seguridad y errores.",
      ],
      [
        "Finalidades y bases jurídicas",
        "Usamos los datos necesarios para prestarte las funciones que solicitas: acceso, perfil, publicaciones, favoritos y reservas (ejecución del servicio solicitado, artículo 6.1.b del RGPD). La protección de cuentas, prevención de abusos y gestión de incidencias se apoyan en el interés legítimo de mantener el servicio seguro (artículo 6.1.f), sujeto a tus derechos. La geolocalización del dispositivo es opcional y requiere tu permiso; su uso puede rechazarse. Si una obligación legal exige conservar o comunicar datos, se aplicará el artículo 6.1.c y se identificará esa obligación.",
      ],
      [
        "Datos obligatorios y opcionales",
        "Sin los datos necesarios para identificar la cuenta y tramitar una reserva no podremos ofrecer esas funciones. La descripción, fotografías, mensaje, reseña y uso de geolocalización son opcionales. Puedes explorar las publicaciones sin crear una cuenta.",
      ],
      [
        "Información pública y destinatarios",
        "Las fichas, productos, fotos y ubicación que un vendedor publica pueden ser consultados por visitantes. Los particulares muestran una ubicación aproximada. Las valoraciones y sus comentarios pueden ser públicos; UZTA no muestra el correo del comprador en la reseña. Las reservas son accesibles para el comprador, el vendedor correspondiente y la administración autorizada según sus funciones. Los favoritos son privados de la cuenta.",
      ],
      [
        "Proveedores y transferencias",
        "Supabase presta autenticación, base de datos y almacenamiento; Vercel aloja y distribuye la web. Google interviene si eliges ese acceso. Al cargar el mapa, OpenStreetMap recibe las solicitudes técnicas de tu navegador, incluida la IP. Estos proveedores pueden realizar tratamientos internacionales: sus condiciones publicadas explican las ubicaciones y garantías aplicables, incluidas cláusulas contractuales tipo cuando procedan. Puedes solicitar al responsable información sobre los destinatarios y garantías de las transferencias de tus datos.",
      ],
      [
        "Conservación",
        "Los datos de cuenta, favoritos y el historial solicitado se mantienen mientras mantienes la cuenta y utilizas el servicio, o hasta una solicitud de supresión procedente. Las publicaciones permanecen mientras el vendedor las mantiene publicadas. Actualmente no hay borrado automático por inactividad. Si solicitas la supresión, se eliminarán o anonimizarán los datos que dejen de ser necesarios; los vinculados a una reclamación concreta pendiente podrán limitarse hasta su resolución definitiva. Si una obligación legal exige otro plazo, se te indicarán la norma y el plazo aplicables. Los registros y copias técnicas siguen los ciclos de conservación de cada proveedor; la supresión no implica eliminación instantánea de todas las copias de seguridad.",
      ],
      [
        "Almacenamiento del navegador y pagos",
        "UZTA utiliza almacenamiento técnico del navegador para la sesión, el idioma, la cesta y la recuperación de una reserva pendiente. Puedes cerrarla o borrar estos datos desde tu navegador, lo que puede hacerte perder la cesta o cerrar tu sesión. Actualmente no se han incorporado anuncios ni analítica de comportamiento. UZTA no procesa tarjetas ni pagos online. La preferencia Euros/Eusko, las ventas declaradas y las comisiones registradas no acreditan por sí mismas un pago real.",
      ],
      [
        "Tus derechos",
        "Puedes solicitar acceso, rectificación, supresión, limitación, oposición y portabilidad cuando correspondan escribiendo a uzta.app@gmail.com. También puedes retirar un consentimiento cuando el tratamiento se base en él, sin afectar a usos anteriores lícitos, y retirar el permiso de ubicación en tu dispositivo. Se solicitará información adicional de identidad solo si es necesaria. Puedes reclamar ante la CNIL (cnil.fr) o la autoridad de protección de datos de tu residencia habitual. No se realizan decisiones automatizadas con efectos jurídicos o similares sobre ti.",
      ],
      [
        "Cambios",
        "La fecha de esta página identifica la versión vigente. Los cambios relevantes de finalidad o tratamiento se comunicarán de manera adecuada antes de aplicarse.",
      ],
    ],
  },
  fr: {
    title: "Politique de confidentialité",
    updated: "Mise à jour le",
    draft: "Projet en attente de validation par le responsable.",
    pending:
      "La politique est en attente de validation. Pour toute question : uzta.app@gmail.com.",
    providers: "Informations des prestataires",
    sections: [
      [
        "Responsable et contact",
        "Cristian Martinez, personne physique établie en France, est responsable du traitement des données d’UZTA. Contact pour la confidentialité et les droits : uzta.app@gmail.com.",
      ],
      [
        "Données utilisées",
        "Nous traitons les données du compte et du profil, l’adresse électronique, les identifiants de connexion, la langue et la localité ; les boutiques, produits, photos, localisation publique, favoris, réservations, messages de collecte et avis. Avec Google, nous recevons l’identité, l’adresse électronique et les informations de profil de base fournies, y compris la photo si elle est transmise. Les prestataires peuvent traiter des adresses IP et des journaux techniques d’accès, de sécurité et d’erreurs.",
      ],
      [
        "Finalités et bases légales",
        "Les données nécessaires servent aux fonctions demandées : connexion, profil, publications, favoris et réservations (exécution du service demandé, article 6.1.b du RGPD). La sécurité, la prévention des abus et le traitement des incidents reposent sur l’intérêt légitime à protéger le service (article 6.1.f), sous réserve de vos droits. La géolocalisation de l’appareil est facultative et nécessite votre autorisation ; vous pouvez la refuser. Une obligation légale de conservation ou de communication relève de l’article 6.1.c ; cette obligation sera identifiée.",
      ],
      [
        "Données obligatoires et facultatives",
        "Sans les informations nécessaires à l’identification du compte et à la réservation, ces fonctions ne sont pas disponibles. Description, photos, message, avis et géolocalisation sont facultatifs. Les publications peuvent être consultées sans compte.",
      ],
      [
        "Informations publiques et destinataires",
        "Les fiches, produits, photos et localisation publiés par un vendeur sont visibles par les visiteurs. La localisation des particuliers est approximative. Les avis et commentaires peuvent être publics ; l’adresse électronique de l’acheteur n’y est pas affichée. Les réservations sont accessibles à l’acheteur, au vendeur concerné et à l’administration autorisée selon leurs fonctions. Les favoris sont privés.",
      ],
      [
        "Prestataires et transferts",
        "Supabase fournit l’authentification, la base de données et le stockage ; Vercel héberge et distribue le site. Google intervient si vous choisissez cette connexion. Le chargement de la carte transmet à OpenStreetMap les requêtes techniques du navigateur, dont l’IP. Ces prestataires peuvent effectuer des traitements internationaux ; leurs conditions publiées décrivent les lieux et garanties applicables, notamment les clauses contractuelles types lorsque pertinentes. Vous pouvez demander au responsable des informations sur les destinataires et garanties des transferts de vos données.",
      ],
      [
        "Conservation",
        "Les données de compte, favoris et historique demandé sont conservés pendant le maintien du compte et l’utilisation du service, ou jusqu’à une demande de suppression fondée. Les publications restent accessibles tant que le vendeur les publie. Il n’existe actuellement pas de suppression automatique pour inactivité. Après une demande, les données devenues inutiles sont supprimées ou anonymisées ; celles liées à un litige concret en cours peuvent être restreintes jusqu’à son règlement définitif. Toute durée imposée par une obligation légale sera précisée avec son fondement. Les journaux et sauvegardes suivent les cycles des prestataires ; une suppression n’efface pas instantanément toutes les sauvegardes.",
      ],
      [
        "Stockage du navigateur et paiements",
        "UZTA utilise le stockage technique du navigateur pour la session, la langue, le panier et la reprise d’une réservation en cours. Son effacement peut fermer la session ou supprimer le panier. Aucune publicité ni analyse comportementale n’a actuellement été intégrée. UZTA ne traite ni cartes ni paiements en ligne. Les préférences Euros/Eusko, ventes déclarées et commissions enregistrées ne prouvent pas à elles seules un paiement réel.",
      ],
      [
        "Vos droits",
        "Vous pouvez demander accès, rectification, effacement, limitation, opposition et portabilité lorsque ces droits s’appliquent à uzta.app@gmail.com. Un consentement peut être retiré sans remettre en cause les traitements antérieurs licites ; le droit de localisation se retire sur l’appareil. Un complément d’identité ne sera demandé que si nécessaire. Vous pouvez saisir la CNIL (cnil.fr) ou l’autorité de votre résidence habituelle. Aucune décision automatisée produisant des effets juridiques ou similaires n’est prise à votre égard.",
      ],
      [
        "Modifications",
        "La date de cette page indique la version actuelle. Les modifications importantes des finalités ou traitements seront communiquées de façon appropriée avant leur application.",
      ],
    ],
  },
  en: {
    title: "Privacy policy",
    updated: "Updated on",
    draft: "Draft awaiting approval by the controller.",
    pending:
      "This policy awaits approval. Privacy contact: uzta.app@gmail.com.",
    providers: "Provider information",
    sections: [
      [
        "Controller and contact",
        "Cristian Martinez, an individual established in France, is responsible for UZTA’s personal data processing. Privacy and rights contact: uzta.app@gmail.com.",
      ],
      [
        "Data used",
        "We process account and profile details, email, sign-in identifiers, language and locality; shops, products, photos, public location, favorites, reservations, collection messages and reviews. With Google sign-in, we receive identity, email and basic profile details, including a photo if supplied. Technical providers may process IP addresses and access, security and error logs.",
      ],
      [
        "Purposes and legal bases",
        "Necessary data provides requested sign-in, profile, publishing, favorites and reservation features (performance of the requested service, GDPR Article 6(1)(b)). Security, abuse prevention and incident handling rely on the legitimate interest in protecting the service (Article 6(1)(f)), subject to your rights. Device geolocation is optional and requires your permission; you can refuse it. Any legally required retention or disclosure relies on Article 6(1)(c), with the relevant obligation identified.",
      ],
      [
        "Required and optional information",
        "Without details needed to identify an account and process a reservation, those features cannot be provided. Description, photos, messages, reviews and device location are optional. You can browse listings without an account.",
      ],
      [
        "Public information and recipients",
        "Seller-published profiles, products, photos and locations are visible to visitors. Individual sellers display an approximate location. Reviews and comments may be public; the buyer’s email is not displayed in a review. Reservations are accessible to the buyer, relevant seller and authorized administration according to their functions. Favorites are private to the account.",
      ],
      [
        "Providers and transfers",
        "Supabase provides authentication, database and storage; Vercel hosts and distributes the website. Google is involved if you choose its sign-in. Loading the map sends browser requests, including IP, to OpenStreetMap. Providers may process data internationally; their published terms describe locations and applicable safeguards, including standard contractual clauses where relevant. Ask the controller about recipients and safeguards applicable to transfers of your data.",
      ],
      [
        "Retention",
        "Account data, favorites and requested history remain while you keep the account and use the service, or until a justified erasure request. Listings remain while the seller publishes them. There is currently no automatic deletion for inactivity. Following a request, unnecessary data will be deleted or anonymized; data linked to a specific pending claim may be restricted until its final resolution. Any legally required period will be identified with its legal basis. Logs and backups follow provider retention cycles; deletion does not instantly erase every backup.",
      ],
      [
        "Browser storage and payments",
        "UZTA uses technical browser storage for the session, language, basket and pending-reservation recovery. Clearing it may end your session or remove the basket. Advertising and behavioral analytics have not currently been integrated. UZTA does not process cards or online payments. Euros/Eusko preferences, declared sales and recorded commissions do not themselves verify actual payments.",
      ],
      [
        "Your rights",
        "Request access, correction, erasure, restriction, objection and portability where applicable at uzta.app@gmail.com. You may withdraw consent where processing relies on it without affecting lawful earlier processing, and remove location permission on your device. Further identity information is requested only if needed. You can complain to the CNIL (cnil.fr) or the authority where you habitually reside. No automated decisions with legal or similarly significant effects are made about you.",
      ],
      [
        "Changes",
        "The date identifies this policy version. Significant changes to purposes or processing will be communicated appropriately before they take effect.",
      ],
    ],
  },
  eu: {
    title: "Pribatutasun-politika",
    updated: "Eguneratze-data",
    draft: "Arduradunak onartzeko zain dagoen zirriborroa.",
    pending:
      "Politika onartzeko zain dago. Pribatutasunerako kontaktua: uzta.app@gmail.com.",
    providers: "Hornitzaileen informazioa",
    sections: [
      [
        "Arduraduna eta kontaktua",
        "Cristian Martinez, Frantzian kokatutako pertsona fisikoa, UZTAko datu pertsonalen tratamenduaren arduraduna da. Pribatutasuna eta eskubideak: uzta.app@gmail.com.",
      ],
      [
        "Erabilitako datuak",
        "Kontuaren eta profilaren datuak, posta elektronikoa, sarbide-identifikatzaileak, hizkuntza eta herria tratatzen ditugu; dendak, produktuak, argazkiak, kokapen publikoa, gogokoak, erreserbak, bilketa-mezuak eta balorazioak ere bai. Google bidez sartzean, identitatea, posta eta oinarrizko profila jasotzen ditugu, argazkia barne Googlek ematen badu. Hornitzaile teknikoek IP helbideak eta sarbide-, segurtasun- eta errore-erregistroak trata ditzakete.",
      ],
      [
        "Helburuak eta oinarri juridikoak",
        "Beharrezko datuak eskatutako zerbitzurako erabiltzen dira: sarbidea, profila, argitalpenak, gogokoak eta erreserbak (DBEOren 6.1.b artikulua). Segurtasuna, gehiegikerien prebentzioa eta gorabeheren kudeaketa zerbitzua babesteko interes legitimoan oinarritzen dira (6.1.f artikulua), zure eskubideak errespetatuz. Gailuaren geolokalizazioa aukerakoa da eta baimena behar du; uko egin diezaiokezu. Legez datuak gorde edo jakinarazi behar badira, 6.1.c artikulua aplikatuko da eta betebeharra zehaztuko da.",
      ],
      [
        "Nahitaezko eta aukerako datuak",
        "Kontua identifikatzeko eta erreserba egiteko beharrezko daturik gabe ezin dira funtzio horiek eskaini. Deskribapena, argazkiak, mezuak, balorazioak eta geolokalizazioa aukerakoak dira. Argitalpenak konturik gabe ikus daitezke.",
      ],
      [
        "Informazio publikoa eta hartzaileak",
        "Saltzaileak argitaratutako fitxak, produktuak, argazkiak eta kokapena bisitariek ikus ditzakete. Partikularren kokapena gutxi gorabeherakoa da. Balorazioak eta iruzkinak publikoak izan daitezke; eroslearen posta ez da balorazioan erakusten. Erreserbak erosleak, dagokion saltzaileak eta administrazio baimenduak ikus ditzakete, beren funtzioen arabera. Gogokoak kontuaren pribatuak dira.",
      ],
      [
        "Hornitzaileak eta transferentziak",
        "Supabasek autentifikazioa, datu-basea eta biltegiratzea eskaintzen ditu; Vercelek weba ostatatu eta banatzen du. Googlek parte hartzen du sarbide hori hautatzen baduzu. Mapa kargatzean nabigatzaileak eskaera teknikoak bidaltzen dizkio OpenStreetMapi, IP helbidea barne. Hornitzaileek nazioarteko tratamenduak egin ditzakete; argitaratutako baldintzek kokapenak eta aplikagarriak diren bermeak azaltzen dituzte, kontratu-klausula estandarrak barne, hala dagokionean. Zure datuen transferentzien hartzaile eta bermeei buruzko informazioa eskatu arduradunari.",
      ],
      [
        "Kontserbazioa",
        "Kontuaren datuak, gogokoak eta eskatutako historia gordetzen dira kontua mantendu eta zerbitzua erabiltzen duzun bitartean, edo bidezko ezabatze-eskaera egin arte. Argitalpenak saltzaileak argitaratuta mantentzen dituen bitartean daude ikusgai. Une honetan ez dago jarduerarik ezagatik ezabatze automatikorik. Eskaeraren ondoren, beharrezkoak ez diren datuak ezabatu edo anonimizatuko dira; erreklamazio zehatz bati lotutakoak mugatu egin daitezke hura behin betiko ebatzi arte. Legezko epeak oinarri juridikoarekin batera zehaztuko dira. Erregistroek eta babes-kopiek hornitzaileen zikloak jarraitzen dituzte; ezabatzeak ez ditu kopia guztiak berehala kentzen.",
      ],
      [
        "Nabigatzailearen biltegiratzea eta ordainketak",
        "UZTAk biltegiratze teknikoa erabiltzen du saiorako, hizkuntzarako, saskirako eta zain dagoen erreserba berreskuratzeko. Ezabatzeak saioa itxi edo saskia gal dezake. Une honetan ez dago publizitaterik edo portaera-analitikarik integratuta. UZTAk ez ditu txartelak edo online ordainketak prozesatzen. Euro/Eusko lehentasunek, adierazitako salmentek eta erregistratutako komisioek ez dute berez benetako ordainketarik egiaztatzen.",
      ],
      [
        "Zure eskubideak",
        "Sarbidea, zuzenketa, ezabatzea, mugaketa, aurka egitea eta eramangarritasuna eska ditzakezu, dagokionean, uzta.app@gmail.com helbidean. Tratamendua baimenean oinarritzen bada, baimena kendu dezakezu aurreko legezko erabilerei eragin gabe; kokapen-baimena gailuan ken daiteke. Identitateari buruzko informazio gehigarria beharrezkoa denean bakarrik eskatuko da. CNILen (cnil.fr) edo ohiko bizilekuko agintaritzan erreklamazioa jar dezakezu. Ez da zuri buruzko ondorio juridiko edo antzekoak dituen erabaki automatizaturik hartzen.",
      ],
      [
        "Aldaketak",
        "Datak politikaren bertsioa identifikatzen du. Helburu edo tratamenduetako aldaketa esanguratsuak behar bezala jakinaraziko dira aplikatu aurretik.",
      ],
    ],
  },
};
