import HttpUtils from "@/utils/HttpUtils";

export async function fetchPluginConfig(pluginType: string) {
  return HttpUtils.get<any>(`/api/v1/data-source/plugin/config?pluginType=${pluginType}`);
}

export async function uploadDriverJar(pluginType: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("pluginType", pluginType);

  const res = await HttpUtils.postForm<any>(
    "/api/v1/data-source/plugin/driver/upload",
    formData
  );

  console.log(res);

  if (res?.code !== 0) throw new Error(res?.message || "upload failed");
  return res?.data; // string | { fileName, path }
}
