import type { H2HPlayer, H2HTeam } from './h2h-types'
import { getFlagUrl } from './countries'

export interface SquadPlayer {
  name: string
  shortName: string
  position: 'FWD' | 'MID' | 'DEF' | 'GK'
  overall: number
  pace: number
  shooting: number
  dribbling: number
  passing: number
  physical: number
  specialMove: string
  specialDesc: string
}

export interface FCTeam {
  code: string
  name: string
  countryName: string
  primaryColor: string
  secondaryColor: string
  socksColor: string
  bootColor: string
  squad: SquadPlayer[]
}

function p(name: string, shortName: string, pos: SquadPlayer['position'], ovr: number, pac: number, sho: number, dri: number, pas: number, phy: number, move: string, desc: string): SquadPlayer {
  return { name, shortName, position: pos, overall: ovr, pace: pac, shooting: sho, dribbling: dri, passing: pas, physical: phy, specialMove: move, specialDesc: desc }
}

export const FC_TEAMS: FCTeam[] = [
  {
    code: 'BRA', name: 'BRAZIL', countryName: 'Brazil',
    primaryColor: '#FFDF00', secondaryColor: '#009c3b', socksColor: '#FFFFFF', bootColor: '#222222',
    squad: [
      p('Vinicius Jr.', 'VINICIUS JR.', 'FWD', 89, 97, 88, 97, 80, 82, 'Elastico Sprint', 'Blazing run past defenders with flair'),
      p('Rodrygo', 'RODRYGO', 'FWD', 84, 90, 82, 88, 80, 68, 'Shadow Step', 'Glides into space unnoticed'),
      p('Raphinha', 'RAPHINHA', 'FWD', 83, 88, 84, 86, 78, 72, 'Wing Cutter', 'Cuts inside with devastating effect'),
      p('Bruno Guimaraes', 'B. GUIMARAES', 'MID', 83, 72, 76, 82, 86, 84, 'Engine Room', 'Tireless midfield dominance'),
      p('Marquinhos', 'MARQUINHOS', 'DEF', 82, 74, 52, 68, 72, 88, 'Iron Wall', 'Last-ditch tackle perfection'),
    ],
  },
  {
    code: 'ARG', name: 'ARGENTINA', countryName: 'Argentina',
    primaryColor: '#75AADB', secondaryColor: '#FFFFFF', socksColor: '#FFFFFF', bootColor: '#222222',
    squad: [
      p('L. Messi', 'MESSI', 'FWD', 90, 82, 90, 96, 92, 65, 'La Pulga Magic', 'Impossible dribble through the entire defense'),
      p('L. Martinez', 'L. MARTINEZ', 'FWD', 85, 85, 90, 84, 75, 78, 'Bull Rush', 'Powers through with unstoppable force'),
      p('J. Alvarez', 'J. ALVAREZ', 'FWD', 83, 84, 82, 80, 78, 76, 'Spider Sense', 'Always in the right place at the right time'),
      p('E. Fernandez', 'E. FERNANDEZ', 'MID', 82, 78, 74, 80, 84, 82, 'Midfield General', 'Controls tempo with iron discipline'),
      p('N. Molina', 'MOLINA', 'DEF', 80, 84, 62, 72, 74, 80, 'Overlap Bomb', 'Explosive attacking runs from deep'),
    ],
  },
  {
    code: 'FRA', name: 'FRANCE', countryName: 'France',
    primaryColor: '#002395', secondaryColor: '#FFFFFF', socksColor: '#ED2939', bootColor: '#222222',
    squad: [
      p('Mbappe', 'MBAPPE', 'FWD', 91, 99, 92, 92, 80, 78, 'Rocket Burst', 'Explosive acceleration leaves everyone behind'),
      p('Griezmann', 'GRIEZMANN', 'FWD', 84, 78, 86, 84, 84, 72, 'Hot Zone', 'Deadly finishing inside the box'),
      p('Dembele', 'DEMBELE', 'FWD', 83, 94, 80, 90, 76, 62, 'Both Feet Blitz', 'Unpredictable with either foot'),
      p('Tchouameni', 'TCHOUAMENI', 'MID', 82, 78, 72, 74, 82, 86, 'Ball Winner', 'Intercepts everything in midfield'),
      p('Barcola', 'BARCOLA', 'FWD', 80, 92, 76, 84, 72, 64, 'Flash Feet', 'Lightning-quick step-overs'),
    ],
  },
  {
    code: 'ENG', name: 'ENGLAND', countryName: 'England',
    primaryColor: '#FFFFFF', secondaryColor: '#CF081F', socksColor: '#FFFFFF', bootColor: '#1a1a1a',
    squad: [
      p('Bellingham', 'BELLINGHAM', 'MID', 88, 82, 86, 88, 90, 85, 'Box Arrival', 'Appears in the box at the perfect moment'),
      p('Saka', 'SAKA', 'FWD', 86, 86, 84, 90, 82, 72, 'Starboy Run', 'Drives inside from the right with purpose'),
      p('Foden', 'FODEN', 'MID', 85, 82, 84, 92, 86, 68, 'Pocket Rocket', 'Finds pockets of space nobody else sees'),
      p('Rice', 'RICE', 'MID', 84, 76, 76, 72, 82, 88, 'Shield Master', 'Impenetrable defensive screen'),
      p('Palmer', 'PALMER', 'FWD', 83, 80, 84, 86, 82, 68, 'Cold Palmer', 'Ice-cold composure under pressure'),
    ],
  },
  {
    code: 'GER', name: 'GERMANY', countryName: 'Germany',
    primaryColor: '#FFFFFF', secondaryColor: '#000000', socksColor: '#000000', bootColor: '#222222',
    squad: [
      p('Musiala', 'MUSIALA', 'MID', 85, 84, 82, 94, 86, 68, 'Silk Touch', 'Glides past markers with impossible close control'),
      p('Wirtz', 'WIRTZ', 'MID', 84, 82, 84, 88, 86, 70, 'Vision Play', 'Creates chances from nothing'),
      p('Kimmich', 'KIMMICH', 'MID', 83, 74, 78, 76, 90, 82, 'Swiss Army', 'Plays every position to perfection'),
      p('Sane', 'SANE', 'FWD', 82, 92, 80, 86, 74, 68, 'Turbo Wing', 'Devastating pace down the flank'),
      p('Havertz', 'HAVERTZ', 'FWD', 81, 80, 80, 82, 78, 76, 'Silent Striker', 'Arrives unmarked at the far post'),
    ],
  },
  {
    code: 'ESP', name: 'SPAIN', countryName: 'Spain',
    primaryColor: '#AA151B', secondaryColor: '#F1BF00', socksColor: '#0039A6', bootColor: '#222222',
    squad: [
      p('Rodri', 'RODRI', 'MID', 88, 64, 78, 82, 90, 88, 'Metronome', 'Dictates the entire rhythm of the game'),
      p('Yamal', 'YAMAL', 'FWD', 85, 95, 84, 93, 85, 62, 'La Croqueta', 'Elegant feint that wrong-foots the defense'),
      p('Pedri', 'PEDRI', 'MID', 84, 72, 78, 90, 92, 66, 'Tiki Master', 'One-touch passing at its finest'),
      p('Morata', 'MORATA', 'FWD', 82, 78, 84, 78, 76, 80, 'Poacher Instinct', 'Clinical finishing in the six-yard box'),
      p('D. Olmo', 'OLMO', 'MID', 82, 80, 82, 86, 84, 70, 'False Nine', 'Drifts between the lines to create chaos'),
    ],
  },
  {
    code: 'POR', name: 'PORTUGAL', countryName: 'Portugal',
    primaryColor: '#FF0000', secondaryColor: '#006600', socksColor: '#FF0000', bootColor: '#1a1a1a',
    squad: [
      p('C. Ronaldo', 'C. RONALDO', 'FWD', 84, 82, 90, 82, 74, 80, 'SIUUU Strike', 'Unstoppable header and aerial presence'),
      p('B. Fernandes', 'B. FERNANDES', 'MID', 85, 76, 86, 84, 90, 74, 'Dead Ball King', 'Lethal free kicks and set pieces'),
      p('Leao', 'LEAO', 'FWD', 84, 94, 82, 92, 76, 70, 'Sprint Dribble', 'Carries the ball at full speed with ease'),
      p('B. Silva', 'B. SILVA', 'MID', 84, 75, 80, 90, 88, 70, 'Thread Needle', 'Passes through the tightest gaps'),
      p('J. Felix', 'J. FELIX', 'FWD', 80, 84, 80, 86, 82, 66, 'Flair Move', 'Elegant tricks that unlock defenses'),
    ],
  },
  {
    code: 'NED', name: 'NETHERLANDS', countryName: 'Netherlands',
    primaryColor: '#FF6600', secondaryColor: '#FFFFFF', socksColor: '#FF6600', bootColor: '#222222',
    squad: [
      p('Gakpo', 'GAKPO', 'FWD', 82, 88, 85, 84, 78, 80, 'Total Strike', 'Unstoppable shot from any angle'),
      p('Xavi Simons', 'X. SIMONS', 'MID', 83, 86, 82, 88, 84, 68, 'Young Gun', 'Fearless dribbling at pace'),
      p('Dumfries', 'DUMFRIES', 'DEF', 80, 86, 64, 72, 68, 84, 'Tank Run', 'Bulldozes down the wing'),
      p('De Ligt', 'DE LIGT', 'DEF', 81, 68, 50, 62, 70, 88, 'Rock Solid', 'Wins every aerial duel'),
      p('Frimpong', 'FRIMPONG', 'DEF', 80, 94, 62, 78, 72, 78, 'Speed Demon', 'Fastest fullback in the game'),
    ],
  },
  {
    code: 'MAR', name: 'MOROCCO', countryName: 'Morocco',
    primaryColor: '#C1272D', secondaryColor: '#006233', socksColor: '#C1272D', bootColor: '#222222',
    squad: [
      p('Hakimi', 'HAKIMI', 'DEF', 84, 96, 70, 82, 80, 82, 'Overlap Blitz', 'Bombing run down the flank'),
      p('En-Nesyri', 'EN-NESYRI', 'FWD', 80, 86, 82, 72, 68, 82, 'Header King', 'Dominant in the air'),
      p('Ziyech', 'ZIYECH', 'MID', 80, 72, 82, 86, 86, 64, 'Curve Master', 'Bends the ball with surgical precision'),
      p('Amrabat', 'AMRABAT', 'MID', 79, 74, 62, 74, 78, 86, 'Iron Lung', 'Never stops running'),
      p('Mazraoui', 'MAZRAOUI', 'DEF', 80, 82, 60, 78, 80, 76, 'Smart Overlap', 'Intelligent runs from the back'),
    ],
  },
  {
    code: 'JPN', name: 'JAPAN', countryName: 'Japan',
    primaryColor: '#000080', secondaryColor: '#FFFFFF', socksColor: '#000080', bootColor: '#1a1a1a',
    squad: [
      p('Kubo', 'KUBO', 'FWD', 82, 86, 82, 90, 82, 65, 'Quick Step', 'Rapid direction changes that dizzy opponents'),
      p('Mitoma', 'MITOMA', 'FWD', 81, 88, 78, 88, 78, 66, 'Ghost Dribble', 'Invisible touches past defenders'),
      p('Kamada', 'KAMADA', 'MID', 79, 76, 78, 82, 82, 70, 'Link-Up King', 'One-two passing perfection'),
      p('Endo', 'ENDO', 'MID', 78, 62, 72, 74, 84, 80, 'Quiet General', 'Reads the game two steps ahead'),
      p('Tomiyasu', 'TOMIYASU', 'DEF', 79, 76, 48, 68, 72, 84, 'Versatile Wall', 'Defends any position flawlessly'),
    ],
  },
  {
    code: 'USA', name: 'USA', countryName: 'USA',
    primaryColor: '#002868', secondaryColor: '#BF0A30', socksColor: '#FFFFFF', bootColor: '#222222',
    squad: [
      p('Pulisic', 'PULISIC', 'FWD', 82, 88, 82, 86, 80, 72, 'Captain Run', 'Fearless charge into the heart of defense'),
      p('McKennie', 'MCKENNIE', 'MID', 79, 78, 72, 74, 76, 84, 'Box Crash', 'Arrives late in the box with power'),
      p('Reyna', 'REYNA', 'MID', 79, 80, 78, 84, 82, 66, 'Creative Spark', 'Unlocks defenses with vision'),
      p('Musah', 'MUSAH', 'MID', 78, 84, 70, 80, 76, 78, 'Ball Carrier', 'Drives forward with strength and pace'),
      p('Dest', 'DEST', 'DEF', 77, 86, 60, 76, 72, 70, 'Marauding Back', 'Attacks from deep with purpose'),
    ],
  },
  {
    code: 'MEX', name: 'MEXICO', countryName: 'Mexico',
    primaryColor: '#006847', secondaryColor: '#FFFFFF', socksColor: '#CE1126', bootColor: '#222222',
    squad: [
      p('E. Alvarez', 'E. ALVAREZ', 'MID', 80, 78, 72, 76, 82, 84, 'El Machin', 'Tireless engine that dominates midfield'),
      p('Lozano', 'LOZANO', 'FWD', 79, 90, 78, 82, 72, 68, 'Chucky Run', 'Terrifying pace on the counter'),
      p('Jimenez', 'JIMENEZ', 'FWD', 78, 76, 82, 74, 70, 82, 'Aerial Threat', 'Wins headers nobody else could'),
      p('Vega', 'VEGA', 'MID', 78, 72, 76, 80, 80, 74, 'Playmaker', 'Orchestrates attacks with calm authority'),
      p('Arteaga', 'ARTEAGA', 'DEF', 77, 80, 58, 70, 74, 78, 'Steady Eddie', 'Reliable and consistent at the back'),
    ],
  },
  {
    code: 'COL', name: 'COLOMBIA', countryName: 'Colombia',
    primaryColor: '#FCD116', secondaryColor: '#003893', socksColor: '#CE1126', bootColor: '#222222',
    squad: [
      p('L. Diaz', 'L. DIAZ', 'FWD', 84, 93, 82, 90, 78, 72, 'Samba Cut', 'Dances past defenders with joyful flair'),
      p('J. Arias', 'J. ARIAS', 'FWD', 80, 88, 78, 82, 76, 70, 'Wing Wizard', 'Delivers pinpoint crosses at pace'),
      p('R. Rios', 'R. RIOS', 'MID', 79, 74, 72, 78, 82, 80, 'Shield Wall', 'Protects the back four with authority'),
      p('Duran', 'DURAN', 'FWD', 79, 86, 80, 76, 68, 78, 'Super Sub', 'Changes the game off the bench'),
      p('Lerma', 'LERMA', 'MID', 78, 68, 66, 72, 78, 84, 'Enforcer', 'Physical presence that intimidates'),
    ],
  },
  {
    code: 'URU', name: 'URUGUAY', countryName: 'Uruguay',
    primaryColor: '#5CBFEB', secondaryColor: '#FFFFFF', socksColor: '#000000', bootColor: '#222222',
    squad: [
      p('Valverde', 'VALVERDE', 'MID', 86, 90, 82, 80, 82, 86, 'Pajarito Sprint', 'Box-to-box runs at lightning speed'),
      p('Nunez', 'NUNEZ', 'FWD', 84, 92, 88, 80, 70, 85, 'Garra Charrua', 'Raw power and never-say-die finishing'),
      p('Araujo', 'ARAUJO', 'DEF', 82, 82, 48, 62, 64, 92, 'Brick Wall', 'Impossible to get past'),
      p('Bentancur', 'BENTANCUR', 'MID', 80, 76, 74, 80, 84, 78, 'Box Runner', 'Arrives late with devastating effect'),
      p('De Arrascaeta', 'ARRASCAETA', 'MID', 80, 72, 80, 86, 84, 68, 'Flair Pass', 'Creates magic with every touch'),
    ],
  },
  {
    code: 'KOR', name: 'SOUTH KOREA', countryName: 'South Korea',
    primaryColor: '#CD2E3A', secondaryColor: '#FFFFFF', socksColor: '#CD2E3A', bootColor: '#1a1a1a',
    squad: [
      p('Son', 'SON', 'FWD', 87, 92, 90, 86, 82, 70, 'Tiger Strike', 'Lethal finish with either foot'),
      p('Lee Kang-in', 'LEE KANG-IN', 'MID', 81, 78, 80, 86, 84, 66, 'Precision Pass', 'Threading balls through defenses'),
      p('Kim Min-jae', 'KIM MIN-JAE', 'DEF', 83, 76, 48, 62, 68, 92, 'The Monster', 'Physical dominance in the air and on ground'),
      p('Hwang Hee-chan', 'HWANG', 'FWD', 79, 90, 78, 80, 72, 74, 'Pace Merchant', 'Outruns every defender'),
      p('Cho Gue-sung', 'CHO', 'FWD', 76, 78, 78, 68, 62, 80, 'Header Machine', 'Deadly in the air from crosses'),
    ],
  },
  {
    code: 'ITA', name: 'ITALY', countryName: 'Italy',
    primaryColor: '#0066CC', secondaryColor: '#FFFFFF', socksColor: '#0066CC', bootColor: '#222222',
    squad: [
      p('Barella', 'BARELLA', 'MID', 85, 82, 82, 84, 88, 82, 'Regista Pass', 'Dictates the game with visionary passing'),
      p('Chiesa', 'CHIESA', 'FWD', 82, 88, 82, 88, 76, 72, 'Counter King', 'Devastating on the break'),
      p('Bastoni', 'BASTONI', 'DEF', 83, 72, 48, 68, 78, 86, 'Ball-Playing CB', 'Starts attacks from the back'),
      p('Donnarumma', 'DONNARUMMA', 'GK', 83, 50, 20, 40, 50, 80, 'Giant Reach', 'Covers the entire goal with wingspan'),
      p('Tonali', 'TONALI', 'MID', 80, 76, 74, 80, 84, 82, 'New Pirlo', 'Elegant midfield control'),
    ],
  },
]

export function fcToPlayer(fc: FCTeam, playerIdx = 0): H2HPlayer {
  const sp = fc.squad[playerIdx] ?? fc.squad[0]
  return {
    id: fc.code.toLowerCase() + '_' + playerIdx,
    name: sp.name,
    shortName: sp.shortName,
    position: sp.position === 'GK' ? 'DEF' : sp.position,
    pace: sp.pace,
    shooting: sp.shooting,
    dribbling: sp.dribbling,
    passing: sp.passing,
    physical: sp.physical,
    overall: sp.overall,
    isStar: sp.overall >= 83,
    specialMove: sp.specialMove,
    specialDesc: sp.specialDesc,
  }
}

export function fcToTeam(fc: FCTeam): H2HTeam {
  return {
    code: fc.code,
    name: fc.name,
    flag: getFlagUrl(fc.countryName),
    primaryColor: fc.primaryColor,
    secondaryColor: fc.secondaryColor,
    socksColor: fc.socksColor,
    bootColor: fc.bootColor,
  }
}
