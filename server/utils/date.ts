// export function formatToLocalISOString(date: Date | string): string {
//     const d = new Date(date);

//     return (
//         d.getFullYear() + "-" +
//         String(d.getMonth() + 1).padStart(2, "0") + "-" +
//         String(d.getDate()).padStart(2, "0") + "T" +
//         String(d.getHours()).padStart(2, "0") + ":" +
//         String(d.getMinutes()).padStart(2, "0") + ":" +
//         String(d.getSeconds()).padStart(2, "0")
//     );
// }
export function formatToLocalISOString(date: Date | string): string {
    const d = new Date(date);

    return (
        d.getUTCFullYear() + "-" +
        String(d.getUTCMonth() + 1).padStart(2, "0") + "-" +
        String(d.getUTCDate()).padStart(2, "0") + "T" +
        String(d.getUTCHours()).padStart(2, "0") + ":" +
        String(d.getUTCMinutes()).padStart(2, "0") + ":" +
        String(d.getUTCSeconds()).padStart(2, "0") + "Z"
    );
}