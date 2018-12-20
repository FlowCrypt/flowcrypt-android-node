package com.yourorg.sample.api.retrofit.request.model;

import android.os.Parcel;
import android.os.Parcelable;

import com.google.gson.annotations.Expose;
import com.google.gson.annotations.SerializedName;

/**
 * @author DenBond7
 */
public class PrivateKeyInfo implements Parcelable {
  public static final Parcelable.Creator<PrivateKeyInfo> CREATOR = new Parcelable.Creator<PrivateKeyInfo>() {
    @Override
    public PrivateKeyInfo createFromParcel(Parcel source) {
      return new PrivateKeyInfo(source);
    }

    @Override
    public PrivateKeyInfo[] newArray(int size) {
      return new PrivateKeyInfo[size];
    }
  };
  @SerializedName("private")
  @Expose
  private String privateKey;
  @Expose
  private String longid;


  public PrivateKeyInfo(String privateKey, String longid) {
    this.privateKey = privateKey;
    this.longid = longid;
  }

  protected PrivateKeyInfo(Parcel in) {
    this.privateKey = in.readString();
    this.longid = in.readString();
  }

  @Override
  public int describeContents() {
    return 0;
  }

  @Override
  public void writeToParcel(Parcel dest, int flags) {
    dest.writeString(this.privateKey);
    dest.writeString(this.longid);
  }
}
