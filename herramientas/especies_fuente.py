# -*- coding: utf-8 -*-
"""
Fuente del catálogo de Payarinos: aves que se pueden ver con regularidad en Asturias
(residentes, estivales, invernantes, migrantes y aves marinas de paso visibles desde la costa).
Se excluyen las rarezas accidentales.

Formato de cada fila (separado por |):
nombre | científico | familia | hábitats | estatus | dimorfismo | descripción

hábitats: M mar abierto, C costa (playas, acantilados), H humedales, ríos y estuarios,
          B bosque, A alta montaña y roquedos, P campiña, prados y matorral, U pueblos y ciudades
estatus:  R residente, E estival (cría), I invernante, P de paso (migración)
dimorfismo: 1 si macho y hembra se distinguen a simple vista, 0 si no

Ejecutar:  python herramientas/especies_fuente.py   -> genera datos/especies.json
"""
import json, re, unicodedata, pathlib

GRUPOS = {
    "Anatidae": "Patos y gansos",
    "Phasianidae": "Gallináceas",
    "Gaviidae": "Aves marinas", "Procellariidae": "Aves marinas", "Hydrobatidae": "Aves marinas",
    "Sulidae": "Aves marinas", "Phalacrocoracidae": "Aves marinas", "Alcidae": "Aves marinas",
    "Stercorariidae": "Aves marinas",
    "Podicipedidae": "Somormujos y zampullines",
    "Ciconiidae": "Garzas, cigüeñas y espátulas", "Threskiornithidae": "Garzas, cigüeñas y espátulas",
    "Ardeidae": "Garzas, cigüeñas y espátulas",
    "Accipitridae": "Rapaces diurnas", "Pandionidae": "Rapaces diurnas", "Falconidae": "Rapaces diurnas",
    "Rallidae": "Rascones, fochas y grullas", "Gruidae": "Rascones, fochas y grullas",
    "Haematopodidae": "Limícolas", "Recurvirostridae": "Limícolas", "Charadriidae": "Limícolas",
    "Scolopacidae": "Limícolas",
    "Laridae": "Gaviotas y charranes",
    "Columbidae": "Palomas y tórtolas",
    "Cuculidae": "Cucos",
    "Tytonidae": "Rapaces nocturnas", "Strigidae": "Rapaces nocturnas",
    "Caprimulgidae": "Vencejos y chotacabras", "Apodidae": "Vencejos y chotacabras",
    "Alcedinidae": "Martín pescador, abubilla y abejaruco", "Meropidae": "Martín pescador, abubilla y abejaruco",
    "Upupidae": "Martín pescador, abubilla y abejaruco",
    "Picidae": "Pájaros carpinteros",
    "Alaudidae": "Alondras, bisbitas y lavanderas", "Motacillidae": "Alondras, bisbitas y lavanderas",
    "Hirundinidae": "Golondrinas y aviones",
    "Cinclidae": "Chochín, acentores y mirlo acuático", "Troglodytidae": "Chochín, acentores y mirlo acuático",
    "Prunellidae": "Chochín, acentores y mirlo acuático",
    "Turdidae": "Petirrojos, mirlos y zorzales", "Muscicapidae": "Petirrojos, mirlos y zorzales",
    "Cettiidae": "Currucas, mosquiteros y carriceros", "Cisticolidae": "Currucas, mosquiteros y carriceros",
    "Locustellidae": "Currucas, mosquiteros y carriceros", "Acrocephalidae": "Currucas, mosquiteros y carriceros",
    "Sylviidae": "Currucas, mosquiteros y carriceros", "Phylloscopidae": "Currucas, mosquiteros y carriceros",
    "Regulidae": "Currucas, mosquiteros y carriceros",
    "Aegithalidae": "Carboneros, herrerillos y trepadores", "Paridae": "Carboneros, herrerillos y trepadores",
    "Sittidae": "Carboneros, herrerillos y trepadores", "Tichodromidae": "Carboneros, herrerillos y trepadores",
    "Certhiidae": "Carboneros, herrerillos y trepadores",
    "Oriolidae": "Córvidos, estorninos y alcaudones", "Laniidae": "Córvidos, estorninos y alcaudones",
    "Corvidae": "Córvidos, estorninos y alcaudones", "Sturnidae": "Córvidos, estorninos y alcaudones",
    "Passeridae": "Gorriones, pinzones y escribanos", "Fringillidae": "Gorriones, pinzones y escribanos",
    "Emberizidae": "Gorriones, pinzones y escribanos",
}

HABITATS = {"M": "Mar abierto", "C": "Costa", "H": "Humedales y ríos", "B": "Bosque",
            "A": "Alta montaña", "P": "Campiña y matorral", "U": "Pueblos y ciudades"}
ESTATUS = {"R": "Residente", "E": "Estival", "I": "Invernante", "P": "De paso"}

DATOS = """
Ánsar común|Anser anser|Anatidae|H|IP|0|Ganso grande y pardo grisáceo con pico anaranjado. En Asturias se ve sobre todo en paso y en invierno, en pequeños bandos en estuarios y prados cercanos.
Barnacla carinegra|Branta bernicla|Anatidae|HC|I|0|Ganso pequeño y oscuro con cabeza y cuello negros y una mancha blanca en el cuello. Inverna en los estuarios de Villaviciosa y del Eo, donde pace la zostera.
Tarro blanco|Tadorna tadorna|Anatidae|HC|IP|1|Pato grande blanco con cabeza verde oscura, banda pectoral castaña y pico rojo; el macho luce una protuberancia en el pico. Frecuente en invierno en los estuarios.
Ánade azulón|Anas platyrhynchos|Anatidae|HU|R|1|El pato más común. El macho tiene la cabeza verde brillante y collar blanco; la hembra es parda moteada. Vive en ríos, charcas, rías y parques.
Ánade friso|Mareca strepera|Anatidae|H|I|1|Pato de tonos grises finamente vermiculados con el obispillo negro en el macho y un espejuelo blanco visible en vuelo. Invernante escaso en lagunas y embalses.
Silbón europeo|Mareca penelope|Anatidae|HC|I|1|El macho tiene la cabeza castaña con frente amarilla y emite un silbido característico. Inverna en estuarios y praderas costeras, a menudo en bandos.
Ánade rabudo|Anas acuta|Anatidae|H|IP|1|Pato esbelto de cuello largo; el macho tiene una larga cola apuntada y una línea blanca que sube por el cuello. Se ve en paso e invierno en rías y lagunas.
Cuchara común|Spatula clypeata|Anatidae|H|IP|1|Inconfundible por su enorme pico en forma de cuchara con el que filtra el agua. El macho combina cabeza verde, pecho blanco y flancos castaños.
Cerceta carretona|Spatula querquedula|Anatidae|H|P|1|Pequeño pato migrador; el macho muestra una ancha ceja blanca curvada. Se ve sobre todo en primavera de paso por humedales costeros.
Cerceta común|Anas crecca|Anatidae|H|I|1|El pato más pequeño de Europa. El macho tiene la cabeza castaña con una banda verde alrededor del ojo. Frecuente en invierno en rías y charcas.
Porrón europeo|Aythya ferina|Anatidae|H|I|1|Pato buceador; el macho tiene cabeza rojiza, pecho negro y dorso gris claro. Inverna en embalses y lagunas del interior y la costa.
Porrón moñudo|Aythya fuligula|Anatidae|H|I|1|Pato buceador negro y blanco con un moño colgante en la nuca y ojo amarillo. Invernante en embalses y lagunas.
Porrón bastardo|Aythya marila|Anatidae|HC|I|1|Parecido al porrón moñudo pero con el dorso gris y sin moño. Escaso invernante en rías y en el mar cerca de la costa.
Eider común|Somateria mollissima|Anatidae|MC|I|1|Pato marino robusto de pico en cuña. El macho es blanco y negro; la hembra, parda finamente barrada. Escaso en invierno en la costa.
Negrón común|Melanitta nigra|Anatidae|MC|IP|1|Pato marino; el macho es totalmente negro con una mancha amarilla en el pico. Pasa en bandos en fila sobre el mar en otoño e invierno.
Negrón especulado|Melanitta fusca|Anatidae|MC|I|1|Pato marino negro con un espejo blanco en el ala muy visible en vuelo. Escaso en invierno, a veces mezclado con negrones comunes.
Porrón osculado|Bucephala clangula|Anatidae|HC|I|1|Pato buceador de cabeza triangular; el macho es blanco con cabeza verde oscura y una mancha blanca junto al pico. Escaso invernante en rías.
Serreta mediana|Mergus serrator|Anatidae|MC|I|1|Pato buceador de pico fino y aserrado con cresta despeinada. Inverna en rías y en el mar junto a la costa.
Urogallo cantábrico|Tetrao urogallus|Phasianidae|BA|R|1|La gran gallinácea de los bosques cantábricos, hoy en peligro de extinción. El macho es negruzco con ceja roja y cola en abanico; la hembra, parda barrada.
Perdiz pardilla|Perdix perdix|Phasianidae|AP|R|0|Perdiz pequeña de cara anaranjada y flancos barrados. Vive en brezales y piornales de alta montaña de la cordillera.
Perdiz roja|Alectoris rufa|Phasianidae|P|R|0|Perdiz de pico y patas rojas, babero blanco ribeteado de negro y flancos listados. Escasa en campiñas y laderas soleadas del interior.
Codorniz común|Coturnix coturnix|Phasianidae|P|E|1|Pequeña gallinácea migradora, difícil de ver pero fácil de oír por su canto trisilábico en prados y mieses en verano.
Faisán común|Phasianus colchicus|Phasianidae|P|R|1|Introducido para la caza. El macho tiene la cabeza verde con carúnculas rojas y una larga cola; la hembra es parda.
Colimbo chico|Gavia stellata|Gaviidae|MC|I|0|El colimbo más pequeño, de pico fino y algo respingón. En invierno se ve en el mar cerca de la costa y en rías.
Colimbo ártico|Gavia arctica|Gaviidae|MC|I|0|Colimbo mediano de cabeza redondeada. Escaso invernante en el mar cerca de la costa.
Colimbo grande|Gavia immer|Gaviidae|MC|I|0|El colimbo más grande, de pico robusto. Inverna en la costa cantábrica y se ve buceando en ensenadas y bocas de ría.
Fulmar boreal|Fulmarus glacialis|Procellariidae|M|P|0|Ave marina parecida a una gaviota pero de vuelo planeado y alas rígidas, con un tubo nasal sobre el pico. Se ve en paso desde los cabos.
Pardela cenicienta|Calonectris borealis|Procellariidae|M|P|0|Pardela grande de pico amarillo que planea sobre las olas. Pasa en gran número frente a los cabos asturianos a final de verano y otoño.
Pardela capirotada|Ardenna gravis|Procellariidae|M|P|0|Pardela con un capirote oscuro bien definido y collar blanco. Se ve en paso otoñal, a veces en buenos números con vientos del noroeste.
Pardela sombría|Ardenna grisea|Procellariidae|M|P|0|Pardela oscura con la parte inferior de las alas plateada. Pasa en otoño desde el Atlántico sur y se ve desde los cabos.
Pardela pichoneta|Puffinus puffinus|Procellariidae|M|P|0|Pardela pequeña de contraste nítido entre dorso negro y vientre blanco. Pasa rasante sobre el mar en primavera y otoño.
Pardela balear|Puffinus mauretanicus|Procellariidae|M|P|0|Pardela pequeña parda de vientre sucio, en peligro crítico. Frecuente en paso otoñal frente a la costa cantábrica.
Paíño europeo|Hydrobates pelagicus|Hydrobatidae|M|E|0|El ave marina más pequeña de Europa, negra con obispillo blanco. Cría en islotes de la costa asturiana y solo visita tierra de noche.
Paíño de Leach|Hydrobates leucorhous|Hydrobatidae|M|P|0|Paíño de cola ahorquillada y vuelo errático. Se ve desde la costa sobre todo tras temporales de otoño.
Zampullín común|Tachybaptus ruficollis|Podicipedidae|H|R|0|Pequeña ave buceadora redondeada que se zambulle a menudo. Vive en charcas, lagunas y ríos tranquilos.
Somormujo lavanco|Podiceps cristatus|Podicipedidae|H|RI|0|Ave buceadora elegante de cuello largo con cresta y golilla en época de cría. Se ve en embalses y en invierno en rías.
Zampullín cuellinegro|Podiceps nigricollis|Podicipedidae|HC|I|0|Pequeño zampullín de pico fino respingón y ojo rojo. Escaso en invierno en rías y puertos.
Cigüeña blanca|Ciconia ciconia|Ciconiidae|PH|EP|0|Gran ave blanca y negra de pico y patas rojas. Escasa reproductora en Asturias y más frecuente en paso migratorio.
Cigüeña negra|Ciconia nigra|Ciconiidae|H|P|0|Cigüeña negra con brillo metálico y vientre blanco, muy esquiva. Se ve de paso en ríos y estuarios.
Espátula común|Platalea leucorodia|Threskiornithidae|HC|PI|0|Ave blanca con un pico largo aplanado en forma de espátula. Para en los estuarios durante la migración y algunas invernan.
Morito común|Plegadis falcinellus|Threskiornithidae|H|PI|0|Ave oscura con brillos verdes y pico largo curvado hacia abajo. Cada vez más frecuente en humedales costeros.
Martinete común|Nycticorax nycticorax|Ardeidae|H|P|0|Garza robusta de cuello corto, dorso negro y alas grises, de hábitos crepusculares. Escasa de paso en ríos y estuarios.
Garcilla bueyera|Bubulcus ibis|Ardeidae|PH|R|0|Pequeña garza blanca que sigue al ganado en los prados para cazar insectos. Muy extendida en la campiña costera.
Garza real|Ardea cinerea|Ardeidae|H|R|0|La garza grande y gris de ríos, rías y charcas. Caza inmóvil al acecho y vuela con el cuello recogido.
Garza imperial|Ardea purpurea|Ardeidae|H|P|0|Garza esbelta de tonos rojizos y cuello con listas negras. Escasa de paso en humedales costeros.
Garceta grande|Ardea alba|Ardeidae|H|IP|0|Garza blanca tan grande como la garza real, de pico amarillo en invierno. Cada vez más común en los estuarios.
Garceta común|Egretta garzetta|Ardeidae|HC|R|0|Garza blanca mediana de pico negro y "zapatillas" amarillas. Frecuente en rías y estuarios.
Alcatraz atlántico|Morus bassanus|Sulidae|M|PI|0|La mayor ave marina del Cantábrico, blanca con puntas de las alas negras y cabeza teñida de amarillo. Se lanza en picado al mar para pescar; se ve desde cualquier cabo.
Cormorán grande|Phalacrocorax carbo|Phalacrocoracidae|HC|I|0|Ave marina grande y oscura que nada muy hundida y seca las alas abiertas. Inverna en rías, puertos y embalses.
Cormorán moñudo|Gulosus aristotelis|Phalacrocoracidae|MC|R|0|Cormorán más pequeño y verdoso, con un moño en época de cría. Cría en los acantilados y es exclusivamente marino.
Abejero europeo|Pernis apivorus|Accipitridae|BP|E|1|Rapaz de cabeza pequeña, parecida a un busardo, que se alimenta de avispas y abejas. Estival en bosques y campiña.
Milano negro|Milvus migrans|Accipitridae|PH|E|0|Rapaz oscura de cola ligeramente ahorquillada. Llega en primavera y es común cerca de ríos, vertederos y pueblos.
Milano real|Milvus milvus|Accipitridae|P|IR|0|Rapaz rojiza elegante de cola muy ahorquillada y cabeza blanquecina. Escasa, más frecuente en invierno en el sur de la región.
Quebrantahuesos|Gypaetus barbatus|Accipitridae|A|R|0|Enorme buitre de cola en cuña que se alimenta de huesos. Reintroducido en los Picos de Europa, donde ya se le puede ver.
Alimoche común|Neophron percnopterus|Accipitridae|AP|E|0|Pequeño buitre blanco y negro de cara amarilla. Estival en zonas de roquedo y cortados del interior.
Buitre leonado|Gyps fulvus|Accipitridae|AP|R|0|Gran buitre pardo de cabeza blanca que planea en grupos. Habitual en los Picos de Europa y las sierras del oriente.
Culebrera europea|Circaetus gallicus|Accipitridae|PA|E|0|Águila de vientre blanco y cabeza grande que se cierne en el aire para cazar culebras. Estival en laderas soleadas.
Aguilucho lagunero occidental|Circus aeruginosus|Accipitridae|H|P|1|Rapaz de vuelo bajo con las alas en V sobre carrizales. Se ve sobre todo de paso en los humedales costeros.
Aguilucho pálido|Circus cyaneus|Accipitridae|PA|RI|1|El macho es gris perla con puntas de las alas negras; la hembra es parda con obispillo blanco. Caza en vuelo bajo sobre brezales.
Aguilucho cenizo|Circus pygargus|Accipitridae|PA|E|1|Aguilucho esbelto de alas estrechas. Estival escaso en brezales y piornales de montaña.
Azor común|Accipiter gentilis|Accipitridae|B|R|0|Rapaz forestal potente de ceja blanca y ojo naranja. Caza por sorpresa entre los árboles; difícil de ver.
Gavilán común|Accipiter nisus|Accipitridae|BPU|R|1|Pequeña rapaz de alas cortas y cola larga que caza pájaros. El macho tiene el pecho barrado de naranja; la hembra, de gris.
Busardo ratonero|Buteo buteo|Accipitridae|PB|R|0|La rapaz más común de Asturias. Se posa en postes y árboles junto a carreteras y planea en círculos maullando.
Águila real|Aquila chrysaetos|Accipitridae|A|R|0|Gran águila oscura de nuca dorada. Vive en las zonas más agrestes de la cordillera y los Picos de Europa.
Aguililla calzada|Hieraaetus pennatus|Accipitridae|BP|E|0|Pequeña águila con una forma clara y otra oscura. Estival en zonas de bosque y campiña.
Águila pescadora|Pandion haliaetus|Pandionidae|HC|P|0|Rapaz blanca y parda especializada en pescar lanzándose al agua. Se ve en paso en estuarios y embalses.
Cernícalo vulgar|Falco tinnunculus|Falconidae|PCU|R|1|Pequeño halcón que se cierne en el aire sobre prados y taludes. El macho tiene la cabeza gris; la hembra es toda rojiza.
Esmerejón|Falco columbarius|Falconidae|PC|I|1|El halcón más pequeño, de vuelo rápido y bajo. Invernante escaso en campiñas y zonas costeras abiertas.
Alcotán europeo|Falco subbuteo|Falconidae|PB|E|0|Halcón elegante de "bigotes" y "calzones" rojizos que caza libélulas y golondrinas al vuelo. Estival.
Halcón peregrino|Falco peregrinus|Falconidae|CAU|R|0|El ave más rápida del mundo en picado. Cría en acantilados costeros y cortados de montaña, y a veces en edificios.
Rascón europeo|Rallus aquaticus|Rallidae|H|R|0|Ave de carrizal de pico largo y rojo, más fácil de oír (con sus gruñidos) que de ver.
Gallineta común|Gallinula chloropus|Rallidae|HU|R|0|Ave negruzca de pico rojo con punta amarilla que mueve la cola al nadar. Común en charcas, ríos y parques.
Focha común|Fulica atra|Rallidae|H|RI|0|Ave acuática negra con un escudo frontal blanco. Frecuente en lagunas y embalses, sobre todo en invierno.
Grulla común|Grus grus|Gruidae|P|P|0|Gran ave gris de cuello largo que migra en bandos en forma de V con un sonoro "gru-gru". Se ve pasar en otoño y febrero.
Ostrero euroasiático|Haematopus ostralegus|Haematopodidae|C|I|0|Limícola blanco y negro con pico largo naranja y patas rosadas. Inverna en playas rocosas y estuarios.
Cigüeñuela común|Himantopus himantopus|Recurvirostridae|H|P|1|Limícola blanco y negro con patas rosas larguísimas. Escasa de paso en humedales costeros.
Avoceta común|Recurvirostra avosetta|Recurvirostridae|H|PI|0|Limícola blanco y negro con un fino pico curvado hacia arriba. Escasa en estuarios en paso e invierno.
Avefría europea|Vanellus vanellus|Charadriidae|P|I|0|Limícola de dorso verde metálico y moño fino. Inverna en bandos en prados encharcados.
Chorlito dorado europeo|Pluvialis apricaria|Charadriidae|P|I|0|Limícola de dorso moteado de dorado. Inverna en bandos en prados y campos abiertos cercanos a la costa.
Chorlito gris|Pluvialis squatarola|Charadriidae|C|IP|0|Limícola grisáceo moteado con axilas negras visibles en vuelo. Inverna en estuarios y playas.
Chorlitejo grande|Charadrius hiaticula|Charadriidae|C|IP|0|Pequeño limícola de collar negro y pico naranja con punta negra. Frecuente en playas en paso e invierno.
Chorlitejo chico|Charadrius dubius|Charadriidae|H|E|0|Pequeño chorlitejo con anillo ocular amarillo. Cría escaso en graveras de ríos.
Chorlitejo patinegro|Charadrius alexandrinus|Charadriidae|C|RI|1|Chorlitejo pálido de patas oscuras y collar incompleto. Cría en muy pocas playas y es muy sensible a las molestias.
Chorlito carambolo|Charadrius morinellus|Charadriidae|A|P|0|Chorlito de ceja blanca que hace paradas en las cumbres de la cordillera durante su migración de finales de verano.
Zarapito trinador|Numenius phaeopus|Scolopacidae|C|P|0|Limícola grande de pico curvo y listas en la cabeza. Se oye su trino de siete notas en paso por rías y costas rocosas.
Zarapito real|Numenius arquata|Scolopacidae|HC|I|0|El limícola más grande, de pico larguísimo y curvado. Inverna en estuarios y playas.
Aguja colipinta|Limosa lapponica|Scolopacidae|HC|IP|0|Limícola de pico largo algo curvado hacia arriba. Frecuente en los estuarios en paso e invierno.
Aguja colinegra|Limosa limosa|Scolopacidae|H|P|0|Limícola elegante de pico recto y cola negra con obispillo blanco. De paso en humedales costeros.
Vuelvepiedras común|Arenaria interpres|Scolopacidae|C|IP|0|Pequeño limícola rechoncho que da la vuelta a piedras y algas buscando comida. Común en costas rocosas y puertos.
Correlimos gordo|Calidris canutus|Scolopacidae|C|P|0|Correlimos robusto, gris en invierno y rojizo en verano. De paso en estuarios y playas.
Combatiente|Calidris pugnax|Scolopacidae|H|P|1|Limícola de patas largas; los machos en primavera lucen gorgueras de colores. De paso en humedales costeros.
Correlimos zarapitín|Calidris ferruginea|Scolopacidae|C|P|0|Correlimos de pico largo y curvado, con obispillo blanco. De paso sobre todo a finales de verano.
Correlimos tridáctilo|Calidris alba|Scolopacidae|C|I|0|Pequeño correlimos muy blanco que corre por la orilla siguiendo las olas. Común en invierno en las playas.
Correlimos común|Calidris alpina|Scolopacidae|HC|IP|0|El correlimos más abundante, de pico algo curvado. Forma bandos en estuarios en invierno.
Correlimos oscuro|Calidris maritima|Scolopacidae|C|I|0|Correlimos oscuro y rechoncho de patas amarillas. Inverna en rocas batidas por las olas y escolleras.
Correlimos menudo|Calidris minuta|Scolopacidae|HC|P|0|El correlimos más pequeño, con una V clara en el dorso. De paso en estuarios.
Becada|Scolopax rusticola|Scolopacidae|B|IR|0|Limícola forestal de pico larguísimo y plumaje de hojarasca, muy difícil de ver. Abundante en invierno en bosques.
Agachadiza chica|Lymnocryptes minimus|Scolopacidae|H|I|0|Agachadiza pequeña y discreta que se agacha hasta que casi la pisas. Escasa invernante en zonas encharcadas.
Agachadiza común|Gallinago gallinago|Scolopacidae|H|I|0|Limícola de pico muy largo y cabeza listada que sale volando en zigzag. Inverna en prados húmedos y juncales.
Andarríos chico|Actitis hypoleucos|Scolopacidae|HC|PI|0|Pequeño limícola que balancea la cola sin parar y vuela rasante sobre el agua. Frecuente en ríos y rías.
Andarríos grande|Tringa ochropus|Scolopacidae|H|PI|0|Limícola oscuro de obispillo blanco muy visible al volar. De paso e invierno en ríos y charcas.
Archibebe oscuro|Tringa erythropus|Scolopacidae|H|P|0|Archibebe de patas rojas y pico fino, casi negro en verano. Escaso de paso en estuarios.
Archibebe claro|Tringa nebularia|Scolopacidae|HC|IP|0|Archibebe grande y pálido de patas verdosas. Frecuente en estuarios en paso e invierno.
Archibebe común|Tringa totanus|Scolopacidae|HC|IP|0|Limícola pardo de patas rojas que da la alarma con gritos nerviosos. Frecuente en estuarios.
Andarríos bastardo|Tringa glareola|Scolopacidae|H|P|0|Andarríos elegante de dorso moteado y ceja clara. De paso en humedales.
Falaropo picogrueso|Phalaropus fulicarius|Scolopacidae|M|P|0|Pequeño limícola que vive en el mar y nada girando. Se ve desde la costa sobre todo tras temporales de otoño.
Págalo grande|Stercorarius skua|Stercorariidae|M|P|0|Ave marina robusta y oscura con manchas blancas en las alas que persigue a otras aves para robarles la comida.
Págalo pomarino|Stercorarius pomarinus|Stercorariidae|M|P|0|Págalo mediano; los adultos tienen las plumas centrales de la cola retorcidas en cuchara. De paso frente a los cabos.
Págalo parásito|Stercorarius parasiticus|Stercorariidae|M|P|0|El págalo más frecuente, ágil perseguidor de charranes y gaviotas. De paso en otoño y primavera.
Págalo rabero|Stercorarius longicaudus|Stercorariidae|M|P|0|El págalo más fino y elegante, con largas plumas centrales en la cola. Escaso de paso.
Frailecillo atlántico|Fratercula arctica|Alcidae|M|I|0|El famoso "loro de mar" de pico colorido en verano. Pasa el invierno en alta mar y se ve a veces desde la costa.
Alca común|Alca torda|Alcidae|MC|I|0|Ave marina blanca y negra de pico grueso y aplanado. Inverna en el mar y se ve desde cabos y puertos.
Arao común|Uria aalge|Alcidae|MC|I|0|Ave marina parecida al alca pero de pico fino y puntiagudo. Inverna en el Cantábrico.
Gaviota tridáctila|Rissa tridactyla|Laridae|M|PI|0|Gaviota marina pequeña de puntas de las alas negras "mojadas en tinta". De paso e invierno, sobre todo con temporales.
Gaviota de Sabine|Xema sabini|Laridae|M|P|0|Pequeña gaviota de alas con un dibujo tricolor muy llamativo. Escasa de paso otoñal en el mar.
Gaviota reidora|Chroicocephalus ridibundus|Laridae|HCU|I|0|Gaviota pequeña que en verano tiene la cabeza chocolate. Muy común en invierno en rías, puertos y ciudades.
Gaviota enana|Hydrocoloeus minutus|Laridae|M|P|0|La gaviota más pequeña del mundo, de vuelo de charrán. De paso en el mar.
Gaviota cabecinegra|Ichthyaetus melanocephalus|Laridae|CU|I|0|Gaviota de alas blanquísimas sin puntas negras y pico rojo robusto. Inverna en playas y puertos.
Gaviota cana|Larus canus|Laridae|C|I|0|Gaviota mediana de pico fino amarillo verdoso y ojo oscuro. Escasa invernante en playas y prados costeros.
Gaviota de Delaware|Larus delawarensis|Laridae|CU|I|0|Gaviota americana con un anillo negro en el pico. Rareza que se ha vuelto habitual en invierno en la costa de Gijón.
Gaviota sombría|Larus fuscus|Laridae|CU|IP|0|Gaviota grande de dorso gris oscuro y patas amarillas. Abundante en invierno en playas y puertos.
Gaviota argéntea europea|Larus argentatus|Laridae|C|I|0|Gaviota grande de dorso gris claro y patas rosadas. Invernante en la costa.
Gaviota patiamarilla|Larus michahellis|Laridae|CMU|R|0|La gaviota grande que vive todo el año en Asturias, de dorso gris y patas amarillas. Cría en acantilados y tejados.
Gavión atlántico|Larus marinus|Laridae|C|I|0|La gaviota más grande del mundo, de dorso negro y pico muy robusto. Invernante en la costa.
Charrancito común|Sternula albifrons|Laridae|C|P|0|El charrán más pequeño, de frente blanca y pico amarillo. Escaso de paso por la costa.
Fumarel común|Chlidonias niger|Laridae|MH|P|0|Pequeño charrán oscuro de vuelo ligero. De paso sobre el mar y humedales costeros a final de verano.
Charrán patinegro|Thalasseus sandvicensis|Laridae|MC|PI|0|Charrán grande de pico negro con punta amarilla y moño despeinado. Frecuente de paso y algunos invernan.
Charrán común|Sterna hirundo|Laridae|MC|P|0|Charrán de pico rojo con punta negra que se lanza al agua a pescar. De paso por la costa.
Charrán ártico|Sterna paradisaea|Laridae|M|P|0|Charrán de pico todo rojo y patas cortas, el ave con la migración más larga del mundo. De paso en el mar.
Paloma bravía|Columba livia|Columbidae|UC|R|0|Antepasada de las palomas domésticas. Las de ciudad son sus descendientes asilvestradas; las silvestres anidan en acantilados.
Paloma zurita|Columba oenas|Columbidae|BP|PI|0|Paloma gris azulada sin manchas blancas en cuello ni alas. De paso e invierno en campiñas.
Paloma torcaz|Columba palumbus|Columbidae|BPU|R|0|La paloma grande de cuello con mancha blanca y banda blanca en las alas. Común en bosques, campiña y parques.
Tórtola europea|Streptopelia turtur|Columbidae|PB|E|0|Pequeña tórtola de dorso escamado anaranjado y ronroneo característico. Estival en declive.
Tórtola turca|Streptopelia decaocto|Columbidae|U|R|0|Tórtola clara con un collar negro en la nuca. Muy común en pueblos y ciudades.
Cuco común|Cuculus canorus|Cuculidae|BP|E|0|Ave grisácea que parece un gavilán y pone sus huevos en nidos de otras aves. Su "cu-cú" anuncia la primavera.
Lechuza común|Tyto alba|Tytonidae|PU|R|0|Rapaz nocturna de disco facial blanco en forma de corazón. Vive en hórreos, iglesias y casas abandonadas.
Autillo europeo|Otus scops|Strigidae|PB|E|0|Pequeño búho con orejas que emite un silbido monótono en las noches de verano.
Búho real|Bubo bubo|Strigidae|AB|R|0|El búho más grande de Europa, de ojos naranjas y grandes "orejas". Vive en cortados rocosos.
Mochuelo europeo|Athene noctua|Strigidae|P|R|0|Pequeño búho de ojos amarillos y cara de enfado que se deja ver de día en postes y muros.
Cárabo común|Strix aluco|Strigidae|BU|R|0|Rapaz nocturna redonda y sin orejas, autora del clásico ulular nocturno. Común en bosques y parques.
Búho chico|Asio otus|Strigidae|B|R|0|Búho esbelto de ojos naranjas y largas "orejas". Vive en bosquetes y setos de campiña.
Búho campestre|Asio flammeus|Strigidae|PC|I|0|Búho de ojos amarillos que caza de día en zonas abiertas. Escaso invernante en campiñas y costas.
Chotacabras europeo|Caprimulgus europaeus|Caprimulgidae|PB|E|1|Ave nocturna de plumaje críptico que caza insectos en vuelo; su canto es un ronroneo continuo. El macho tiene manchas blancas en alas y cola.
Vencejo común|Apus apus|Apodidae|UA|E|0|Ave negruzca de alas en forma de hoz que pasa casi toda su vida volando. Llena de chillidos los cielos urbanos en verano.
Vencejo pálido|Apus pallidus|Apodidae|UC|E|0|Muy parecido al vencejo común pero algo más pardo y pálido. Escaso en edificios y acantilados costeros.
Vencejo real|Tachymarptis melba|Apodidae|A|E|0|Vencejo grande de vientre blanco. Cría en cortados de montaña y acantilados.
Martín pescador común|Alcedo atthis|Alcedinidae|H|R|1|Joya azul y naranja que pesca zambulléndose desde una rama. La hembra tiene la base del pico inferior naranja.
Abejaruco europeo|Merops apiaster|Meropidae|P|PE|0|Ave multicolor que caza abejas al vuelo. Pasa en bandos ruidosos y cría en contados taludes.
Abubilla común|Upupa epops|Upupidae|P|E|0|Inconfundible por su cresta en abanico y plumaje anaranjado con alas a rayas. Estival en campiñas soleadas.
Torcecuello euroasiático|Jynx torquilla|Picidae|PB|E|0|Pájaro carpintero atípico, pardo y críptico, que gira el cuello como una serpiente si se le molesta.
Pito real ibérico|Picus sharpei|Picidae|BP|R|1|Pájaro carpintero verde de píleo rojo con una risa sonora. El macho tiene la bigotera roja.
Picamaderos negro|Dryocopus martius|Picidae|B|R|1|El pájaro carpintero más grande de Europa, negro con píleo rojo. Vive en hayedos maduros de la cordillera.
Pico picapinos|Dendrocopos major|Picidae|BU|R|1|Pájaro carpintero blanco y negro con zona anal roja. El macho tiene una mancha roja en la nuca. Tamborilea en primavera.
Pico mediano|Dendrocoptes medius|Picidae|B|R|0|Pájaro carpintero de píleo rojo en ambos sexos. Asturias tiene importantes poblaciones en robledales viejos.
Pico menor|Dryobates minor|Picidae|B|R|1|El pájaro carpintero más pequeño, del tamaño de un gorrión. Se mueve por las ramas finas de la copa.
Alondra totovía|Lullula arborea|Alaudidae|PA|R|0|Alondra pequeña de cola corta y ceja marcada con un canto melancólico. Vive en brezales y claros.
Alondra común|Alauda arvensis|Alaudidae|PA|RI|0|Alondra parda con una cresta corta que canta sin parar mientras sube en vuelo. Vive en pastos de montaña y campos abiertos.
Cogujada común|Galerida cristata|Alaudidae|P|R|0|Alondra con una cresta puntiaguda muy marcada. Escasa en terrenos abiertos y descampados.
Avión zapador|Riparia riparia|Hirundinidae|H|P|0|El avión más pequeño, pardo con un collar oscuro. De paso sobre ríos y humedales.
Avión roquero|Ptyonoprogne rupestris|Hirundinidae|AC|R|0|Avión pardo que vive todo el año en roquedos de montaña y acantilados.
Golondrina común|Hirundo rustica|Hirundinidae|PU|E|0|Golondrina de cola larga ahorquillada y garganta roja. Anida en cuadras y hórreos.
Avión común|Delichon urbicum|Hirundinidae|UA|E|0|Avión negro azulado de obispillo blanco que construye nidos de barro bajo los aleros.
Golondrina dáurica|Cecropis daurica|Hirundinidae|P|E|0|Golondrina de obispillo y nuca anaranjados. Escasa estival que nidifica bajo puentes.
Bisbita campestre|Anthus campestris|Motacillidae|A|E|0|Bisbita pálido y alargado de pastizales secos de montaña. Estival escaso.
Bisbita arbóreo|Anthus trivialis|Motacillidae|BP|E|0|Bisbita que canta en vuelo en paracaídas desde la copa de un árbol. Estival en bordes de bosque.
Bisbita pratense|Anthus pratensis|Motacillidae|PC|I|0|Pequeño bisbita pardo listado. Muy abundante en invierno en prados y zonas costeras.
Bisbita alpino|Anthus spinoletta|Motacillidae|AH|EI|0|Bisbita de alta montaña en verano que baja a riberas y costas en invierno.
Bisbita costero|Anthus petrosus|Motacillidae|C|I|0|Bisbita oscuro de patas negras que vive entre las rocas de la costa.
Lavandera boyera|Motacilla flava|Motacillidae|PH|EP|1|Lavandera de vientre amarillo intenso que acompaña al ganado. El macho tiene la cabeza gris azulada.
Lavandera cascadeña|Motacilla cinerea|Motacillidae|H|R|1|Lavandera de cola muy larga con vientre amarillo y dorso gris. Vive en ríos y arroyos; el macho tiene la garganta negra.
Lavandera blanca|Motacilla alba|Motacillidae|PUC|R|1|Lavandera blanca y negra que mueve sin parar la cola. Muy común en pueblos, prados y playas.
Mirlo acuático europeo|Cinclus cinclus|Cinclidae|H|R|0|Pájaro rechoncho de pechera blanca que bucea y camina bajo el agua en ríos de montaña.
Chochín común|Troglodytes troglodytes|Troglodytidae|BPU|R|0|Pajarillo diminuto de cola levantada con un canto potentísimo para su tamaño.
Acentor común|Prunella modularis|Prunellidae|BP|R|0|Pájaro discreto de cabeza y pecho grises que se mueve como un ratón por el suelo.
Acentor alpino|Prunella collaris|Prunellidae|A|R|0|Acentor grande de flancos rojizos que vive en las cumbres. Confiado con los montañeros.
Petirrojo europeo|Erithacus rubecula|Muscicapidae|BPU|R|0|El pajarillo de pecho naranja que te acompaña en el huerto. Muy común todo el año.
Ruiseñor común|Luscinia megarhynchos|Muscicapidae|PB|E|0|Pájaro pardo de cola rojiza, famoso por su canto, incluso de noche. Estival en sotos y setos.
Pechiazul|Luscinia svecica|Muscicapidae|H|P|1|Pájaro de carrizal; el macho lleva una pechera azul con una mancha central. De paso en humedales.
Colirrojo tizón|Phoenicurus ochruros|Muscicapidae|AUC|R|1|Pájaro oscuro de cola rojiza que tiembla. El macho es negro hollín. Común en tejados y roquedos.
Colirrojo real|Phoenicurus phoenicurus|Muscicapidae|B|PE|1|El macho combina pecho naranja, frente blanca y garganta negra. De paso y escaso reproductor.
Tarabilla norteña|Saxicola rubetra|Muscicapidae|A|E|1|Tarabilla con una ceja blanca marcada. Estival en prados de siega de montaña.
Tarabilla europea|Saxicola rubicola|Muscicapidae|PC|R|1|Pájaro que se posa en lo alto de los arbustos; el macho tiene la cabeza negra y el pecho naranja.
Collalba gris|Oenanthe oenanthe|Muscicapidae|AC|EP|1|Pájaro de obispillo blanco y cola con una T negra. Estival en pastos de alta montaña.
Roquero rojo|Monticola saxatilis|Muscicapidae|A|E|1|El macho tiene la cabeza azul y el pecho naranja. Estival en roquedos de alta montaña.
Roquero solitario|Monticola solitarius|Muscicapidae|CA|R|1|El macho es azul oscuro. Vive en acantilados costeros y cortados rocosos.
Mirlo capiblanco|Turdus torquatus|Turdidae|A|E|1|Mirlo con una media luna blanca en el pecho. Estival en el límite superior del bosque.
Mirlo común|Turdus merula|Turdidae|BPU|R|1|El macho es negro con el pico amarillo; la hembra, parda. Común en jardines y bosques.
Zorzal real|Turdus pilaris|Turdidae|P|I|0|Zorzal grande de cabeza y obispillo grises. Invernante en bandos en prados.
Zorzal común|Turdus philomelos|Turdidae|BPU|RI|0|Zorzal pardo de pecho moteado que rompe caracoles contra las piedras.
Zorzal alirrojo|Turdus iliacus|Turdidae|BP|I|0|Zorzal pequeño de ceja blanca y flancos rojizos. Invernante en bandos.
Zorzal charlo|Turdus viscivorus|Turdidae|BP|R|0|El zorzal más grande, de pecho muy moteado. Vive en bosques claros y pastos de montaña.
Cetia ruiseñor|Cettia cetti|Cettiidae|H|R|0|Pájaro pardo muy escondizo que lanza estrofas explosivas desde la vegetación de ribera.
Buitrón|Cisticola juncidis|Cisticolidae|PC|R|0|Diminuto pájaro listado que canta "tsip-tsip" en vuelo ondulado sobre prados y juncales.
Buscarla pintoja|Locustella naevia|Locustellidae|P|E|0|Pájaro muy escondido cuyo canto parece el de un saltamontes. Estival en matorrales húmedos.
Carricerín común|Acrocephalus schoenobaenus|Acrocephalidae|H|P|0|Pájaro de carrizal con una ceja clara muy marcada. De paso en humedales.
Carricero común|Acrocephalus scirpaceus|Acrocephalidae|H|E|0|Pájaro pardo de carrizal de canto repetitivo. Estival en carrizales costeros.
Zarcero políglota|Hippolais polyglotta|Acrocephalidae|P|E|0|Pájaro amarillento de canto parlanchín. Estival en setos y zarzales.
Curruca rabilarga|Curruca undata|Sylviidae|PC|R|1|Curruca de cola larga, dorso gris y pecho vinoso. Vive en tojales y brezales.
Curruca zarcera|Curruca communis|Sylviidae|P|E|1|Curruca de ala rojiza y garganta blanca. Estival en setos y matorrales.
Curruca mosquitera|Sylvia borin|Sylviidae|BP|E|0|Curruca parda sin marcas con un canto muy rico. Estival en sotos y bosques.
Curruca capirotada|Sylvia atricapilla|Sylviidae|BPU|R|1|El macho tiene un capirote negro y la hembra, marrón. Muy común en bosques y jardines.
Mosquitero papialbo|Phylloscopus bonelli|Phylloscopidae|B|E|0|Mosquitero pálido de obispillo amarillento. Estival en robledales y pinares.
Mosquitero silbador|Phylloscopus sibilatrix|Phylloscopidae|B|P|0|Mosquitero de garganta amarilla y vientre blanco. De paso en bosques.
Mosquitero común|Phylloscopus collybita|Phylloscopidae|BPU|I|0|Pequeño pájaro verdoso que canta "chif-chaf". Muy común en invierno.
Mosquitero ibérico|Phylloscopus ibericus|Phylloscopidae|B|E|0|Casi idéntico al mosquitero común pero con otro canto. Estival en bosques de ribera.
Mosquitero musical|Phylloscopus trochilus|Phylloscopidae|BP|P|0|Mosquitero de canto descendente. De paso en primavera y otoño.
Reyezuelo sencillo|Regulus regulus|Regulidae|B|R|0|El ave más pequeña de Europa, con una cresta amarilla. Vive en pinares y abetales.
Reyezuelo listado|Regulus ignicapilla|Regulidae|BU|R|0|Diminuto pájaro con una ceja blanca y cresta naranja. Común en bosques y parques.
Papamoscas gris|Muscicapa striata|Muscicapidae|BU|E|0|Pájaro grisáceo que sale desde una rama a cazar insectos y vuelve al mismo sitio.
Papamoscas cerrojillo|Ficedula hypoleuca|Muscicapidae|B|P|1|El macho es blanco y negro y la hembra, parda. De paso en bosques y parques.
Mito común|Aegithalos caudatus|Aegithalidae|BU|R|0|Bolita de plumas con una cola larguísima. Se mueve en grupos ruidosos por los bosques.
Herrerillo capuchino|Lophophanes cristatus|Paridae|B|R|0|Pequeño párido con una cresta puntiaguda blanca y negra. Vive en pinares.
Carbonero palustre|Poecile palustris|Paridae|B|R|0|Párido de capirote negro brillante y babero pequeño. Vive en bosques caducifolios.
Carbonero garrapinos|Periparus ater|Paridae|B|R|0|El párido más pequeño, con una mancha blanca en la nuca. Común en pinares y bosques mixtos.
Herrerillo común|Cyanistes caeruleus|Paridae|BU|R|0|Párido azul y amarillo muy acrobático. Común en bosques y jardines.
Carbonero común|Parus major|Paridae|BU|R|1|El párido más grande, de vientre amarillo con una corbata negra, más ancha en el macho.
Trepador azul|Sitta europaea|Sittidae|B|R|0|Pájaro azul grisáceo con antifaz negro que baja por los troncos cabeza abajo.
Treparriscos|Tichodroma muraria|Tichodromidae|A|R|1|Pájaro gris con alas rojas que trepa por paredes de roca. Joya de los Picos de Europa.
Agateador europeo|Certhia brachydactyla|Certhiidae|BU|R|0|Pájaro pardo de pico curvo que trepa por los troncos en espiral.
Agateador euroasiático|Certhia familiaris|Certhiidae|B|R|0|Muy parecido al agateador europeo pero de bosques de montaña como hayedos.
Oropéndola europea|Oriolus oriolus|Oriolidae|B|E|1|El macho es amarillo intenso con alas negras. Se oye su silbido aflautado en sotos en verano.
Alcaudón dorsirrojo|Lanius collurio|Laniidae|PA|E|1|El macho tiene antifaz negro y dorso castaño. Ensarta sus presas en espinos. Estival en setos de montaña.
Arrendajo euroasiático|Garrulus glandarius|Corvidae|B|R|0|Córvido rosado con una mancha azul en el ala. Entierra bellotas y avisa a gritos de cualquier intruso.
Urraca común|Pica pica|Corvidae|PU|R|0|Córvido blanco y negro de cola larga y metálica. Común en campiña y ciudades.
Chova piquigualda|Pyrrhocorax graculus|Corvidae|A|R|0|Córvido negro de pico amarillo que vive en las cumbres y se acerca a los montañeros.
Chova piquirroja|Pyrrhocorax pyrrhocorax|Corvidae|AC|R|0|Córvido negro de pico y patas rojos. Vive en montañas y acantilados costeros.
Grajilla occidental|Coloeus monedula|Corvidae|UC|R|0|Córvido pequeño de nuca gris y ojo claro. Cría en edificios y acantilados.
Corneja negra|Corvus corone|Corvidae|PU|R|0|El córvido negro más común de Asturias. Frecuente en prados, playas y ciudades.
Cuervo grande|Corvus corax|Corvidae|AC|R|0|El córvido más grande, de cola en cuña y voz grave. Vive en montaña y acantilados.
Estornino pinto|Sturnus vulgaris|Sturnidae|PU|RI|0|Estornino con el plumaje moteado de blanco en invierno. Forma enormes bandos en invierno.
Estornino negro|Sturnus unicolor|Sturnidae|PU|R|0|Estornino negro sin motas en verano, muy buen imitador de otros sonidos.
Gorrión común|Passer domesticus|Passeridae|U|R|1|El gorrión de los pueblos y ciudades. El macho tiene el píleo gris y el babero negro.
Gorrión molinero|Passer montanus|Passeridae|P|R|0|Gorrión de píleo castaño y una mancha negra en la mejilla. Vive en la campiña.
Gorrión chillón|Petronia petronia|Passeridae|A|R|0|Gorrión pardo listado con una mancha amarilla en la garganta. Vive en roquedos y pueblos de montaña.
Gorrión alpino|Montifringilla nivalis|Passeridae|A|R|0|Pájaro de alta montaña con grandes manchas blancas en las alas. Vive en las cumbres de los Picos de Europa.
Pinzón vulgar|Fringilla coelebs|Fringillidae|BPU|R|1|El macho tiene pecho rosado y cabeza gris azulada. Uno de los pájaros más comunes.
Pinzón real|Fringilla montifringilla|Fringillidae|B|I|1|Pinzón de pecho anaranjado y obispillo blanco. Invernante, a veces en grandes bandos en hayedos.
Picogordo común|Coccothraustes coccothraustes|Fringillidae|B|R|1|Fringílido de pico enorme capaz de romper huesos de cereza. Discreto en bosques.
Camachuelo común|Pyrrhula pyrrhula|Fringillidae|B|R|1|El macho tiene el pecho rojo rosado y el píleo negro. Vive en bosques y setos.
Verderón común|Chloris chloris|Fringillidae|PU|R|1|Fringílido verde con amarillo en alas y cola. Común en parques y campiña.
Pardillo común|Linaria cannabina|Fringillidae|PC|R|1|El macho tiene el pecho y la frente rojos en primavera. Vive en brezales y campiña.
Piquituerto común|Loxia curvirostra|Fringillidae|B|R|1|Fringílido de pico cruzado para abrir piñas. El macho es rojo y la hembra, verdosa.
Jilguero europeo|Carduelis carduelis|Fringillidae|PU|R|0|Fringílido de cara roja y alas con una franja amarilla. Común en campiña y parques.
Verderón serrano|Serinus citrinella|Fringillidae|A|R|1|Fringílido verde amarillento de nuca gris. Vive en montaña cerca del límite del bosque.
Serín verdecillo|Serinus serinus|Fringillidae|PU|R|1|Pequeño fringílido amarillo listado de canto chisporroteante. Común en jardines.
Lúgano|Spinus spinus|Fringillidae|B|I|1|Pequeño fringílido verde amarillento; el macho tiene píleo negro. Invernante en alisedas.
Escribano triguero|Emberiza calandra|Emberizidae|P|R|0|Escribano pardo y robusto que canta como un manojo de llaves desde postes y cables.
Escribano cerillo|Emberiza citrinella|Emberizidae|PA|R|1|El macho tiene la cabeza amarilla intensa. Vive en zonas abiertas de montaña.
Escribano soteño|Emberiza cirlus|Emberizidae|P|R|1|El macho tiene la cara listada de amarillo y negro. Común en setos de campiña.
Escribano montesino|Emberiza cia|Emberizidae|AP|R|1|Escribano de cabeza gris con listas negras. Vive en laderas rocosas.
Escribano palustre|Emberiza schoeniclus|Emberizidae|H|I|1|El macho tiene la cabeza negra con bigote blanco en primavera. Invernante en carrizales.
"""


def slug(t):
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")


def main():
    especies = []
    vistos = set()
    for n, linea in enumerate([l for l in DATOS.strip().splitlines() if l.strip()], 1):
        partes = [p.strip() for p in linea.split("|")]
        assert len(partes) == 7, linea
        nombre, cientifico, familia, hab, est, dimorf, desc = partes
        assert familia in GRUPOS, familia
        assert cientifico not in vistos, cientifico
        vistos.add(cientifico)
        assert all(h in HABITATS for h in hab), linea
        assert all(e in ESTATUS for e in est), linea
        id_ = slug(cientifico)
        especies.append({
            "id": id_,
            "numero": n,
            "nombre": nombre,
            "cientifico": cientifico,
            "familia": familia,
            "grupo": GRUPOS[familia],
            "habitats": [HABITATS[h] for h in hab],
            "estatus": [ESTATUS[e] for e in est],
            "dimorfismo": dimorf == "1",
            "descripcion": desc,
            "imagen": f"img/aves/{id_}.webp",
        })
    raiz = pathlib.Path(__file__).resolve().parent.parent
    salida = raiz / "datos" / "especies.json"
    salida.parent.mkdir(exist_ok=True)
    salida.write_text(json.dumps({
        "region": "Asturias",
        "total": len(especies),
        "especies": especies,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(especies)} especies -> {salida}")


if __name__ == "__main__":
    main()
