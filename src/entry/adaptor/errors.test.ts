// function that takes an error type and returns a string type
// the errors in the conversion source is defined in ../service/entry.test.ts
// the error code of the conversion destination is written in README.md

function errorToCode(error: Error): string {
    switch (error.message) {
        case "too many members":
            return "TOO_MANY_MEMBERS";
        case "no member":
            return "NO_MEMBER";
        case "teamName Exists":
            return "TEAM_ALREADY_EXISTS";
        default:
            return "UNKNOWN_ERROR";
    }
}