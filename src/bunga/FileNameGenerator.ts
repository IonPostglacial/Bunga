const forbiddenChars = [" ", "*", ".", '"', "/", "\\", "[", "]", ":", ";", "|", ","];

export function generateFileName(name: string): string {
    let generatedName = name;
    for (const char of forbiddenChars) {
        generatedName = generatedName.replace(char, "_");
    }
    return generatedName;
}