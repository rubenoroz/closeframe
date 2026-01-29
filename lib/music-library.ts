export interface MusicTrack {
    id: string;
    name: string;
    url: string;
    duration: number; // in seconds
    category: "Cinematic" | "Upbeat" | "Romantic" | "Ambient" | "Corporate" | "Electronic";
    licenseCode?: string; // Envato Item License Code
}

export const MUSIC_LIBRARY: MusicTrack[] = [
    {
        id: "emotion",
        name: "Emotion",
        url: "/audio/emotion.mp3",
        duration: 148,
        category: "Cinematic",
        licenseCode: "D6Q4YTK7AW"
    },
    {
        id: "energetic-action",
        name: "Energetic Action",
        url: "/audio/energetic-action.mp3",
        duration: 120,
        category: "Upbeat",
        licenseCode: "BU42AK7SCJ"
    },
    {
        id: "epic-sports",
        name: "Epic Sports",
        url: "/audio/epic-sports.mp3",
        duration: 135,
        category: "Cinematic",
        licenseCode: "BJY7W8ES24"
    },
    {
        id: "mexico",
        name: "Mexico",
        url: "/audio/mexico.mp3",
        duration: 180,
        category: "Ambient",
        licenseCode: "LHBWYP27KF"
    },
    {
        id: "emotive-piano",
        name: "NewZhilla Emotive Piano",
        url: "/audio/emotive-piano.mp3",
        duration: 160,
        category: "Romantic",
        licenseCode: "ZU6SELRCD2"
    },
    {
        id: "ninja-energetic",
        name: "Ninja Musiclab Energetic",
        url: "/audio/ninja-energetic.mp3",
        duration: 110,
        category: "Corporate",
        licenseCode: "CZN82DLA79"
    },
    {
        id: "paris-waltz",
        name: "Paris Waltz Accordeon",
        url: "/audio/paris-waltz.mp3",
        duration: 130,
        category: "Romantic",
        licenseCode: "LHE53NPMGW"
    },
    {
        id: "sport-rock",
        name: "Sport Rock (Full)",
        url: "/audio/sport-rock.mp3",
        duration: 140,
        category: "Upbeat",
        licenseCode: "L4GCV6HEFA"
    },
    {
        id: "trance",
        name: "Trance",
        url: "/audio/trance.mp3",
        duration: 180,
        category: "Electronic",
        licenseCode: "RMLSDJFNX9"
    },
    {
        id: "wedding-orchestra",
        name: "Wedding Inspiring Orchestra",
        url: "/audio/wedding-orchestra.mp3",
        duration: 150,
        category: "Romantic",
        licenseCode: "5UM89WTK6S"
    }
];

export function getTrackById(id: string): MusicTrack | undefined {
    return MUSIC_LIBRARY.find(track => track.id === id);
}
