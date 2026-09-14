import type { SubscribedChannel } from "./youtubeApi";

interface ChannelListProps {
  channels: SubscribedChannel[];
  onSelectChannel: (channel: SubscribedChannel) => void;
}

export default function ChannelList({ channels, onSelectChannel }: ChannelListProps) {
  return (
    <>
      <p className="mb-3">登録チャンネル: {channels.length}件</p>
      <ul className="list-group">
        {channels.map((channel) => (
          <li key={channel.channelId} className="list-group-item">
            <button
              type="button"
              className="btn btn-link p-0 text-decoration-none text-reset d-flex align-items-center gap-2 w-100 text-start"
              onClick={() => onSelectChannel(channel)}
            >
              {channel.thumbnailUrl && (
                <img src={channel.thumbnailUrl} alt="" width={32} height={32} className="rounded-circle" />
              )}
              <span>{channel.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
