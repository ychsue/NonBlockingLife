namespace Nbl.Bridge.Requests;
public record TimerRequest(
    int DurationInSeconds,
    bool SkipUi,
    string Title,
    string? Url
);
